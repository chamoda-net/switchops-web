<?php
/**
 * SwitchOps Tech: contact form handler.
 *
 * Emails each enquiry to the team through the contact@switchops.tech mailbox over
 * authenticated SMTP (smtp.hostinger.com), so messages are signed for the domain
 * (SPF/DKIM) and reliably delivered, then sends the visitor a short confirmation.
 *
 * The mailbox password is NOT stored here. It lives in switchops-mail-config.php,
 * one folder ABOVE public_html, where no browser can reach it. Without that file the
 * script falls back to PHP mail(), which Hostinger may silently drop.
 *
 * Every outcome is recorded (no personal data) in switchops-mail.log, also one
 * folder above public_html, so delivery problems can be diagnosed.
 *
 * Replies are JSON for the page's JavaScript; plain form posts (no JavaScript)
 * are redirected back to /contact#sent or #send-failed.
 */

declare(strict_types=1);

// Never print PHP warnings into the response: they would corrupt the JSON reply.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

const TO_EMAIL       = 'contact@switchops.tech';
const FROM_EMAIL     = 'contact@switchops.tech';
const FROM_NAME      = 'SwitchOps Tech Website';
const MAX_PER_HOUR   = 5;     // submissions allowed per visitor IP per hour
const MIN_FILL_SECS  = 3;     // faster than this is treated as a bot
const LEGAL_VERSION  = '1.0'; // Terms and Conditions + Privacy Policy version shown on the site
const INTERESTS      = [
    'Network & Infrastructure',
    'Cloud Solutions',
    'Software & Development',
    'SwitchOps AI demo',
    'EduZone (classes and courses)',
    'Something else',
];
define('PRIVATE_DIR', dirname(__DIR__));                       // the folder above public_html
define('CONFIG_FILE', PRIVATE_DIR . '/switchops-mail-config.php');
define('LOG_FILE', PRIVATE_DIR . '/switchops-mail.log');

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $message, int $status = 200): void
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'message' => $message]);
    } else {
        header('Location: /contact#' . ($ok ? 'sent' : 'send-failed'), true, 303);
    }
    exit;
}

/** One line per event; never names, addresses or message text. */
function log_event(string $event, string $detail = ''): void
{
    $line = gmdate('Y-m-d H:i:s') . ' UTC  ' . str_pad($event, 18) . ' ' . preg_replace('/\s+/', ' ', $detail) . "\n";
    @file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

/** Single-line field: trimmed, length-capped, and stripped of line breaks (blocks header injection). */
function field(string $key, int $max): string
{
    $value = trim((string) ($_POST[$key] ?? ''));
    $value = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $value);
    return mb_substr($value, 0, $max);
}

/** Minimal SMTP client: implicit TLS (465) or STARTTLS (587), AUTH LOGIN, one message per call. */
final class Smtp
{
    /** @var resource */
    private $sock;
    public string $last = '';

    public function __construct(private array $cfg) {}

    private function read(): string
    {
        $resp = '';
        while (($line = fgets($this->sock, 1024)) !== false) {
            $resp .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;   // last line of a reply: "250 ..."
        }
        return $this->last = trim($resp);
    }

    private function cmd(string $command, array $expect, bool $secret = false): string
    {
        fwrite($this->sock, $command . "\r\n");
        $resp = $this->read();
        if (!in_array((int) substr($resp, 0, 3), $expect, true)) {
            throw new RuntimeException(($secret ? '[credentials]' : strtok($command, ' ')) . ' -> ' . $resp);
        }
        return $resp;
    }

    public function send(string $to, string $headers, string $body): void
    {
        $c = $this->cfg;
        $secure = $c['secure'] ?? 'ssl';
        $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
        $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $c['host'] . ':' . (int) $c['port'];
        $this->sock = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
        if (!$this->sock) throw new RuntimeException("connect $remote failed: $errstr ($errno)");
        stream_set_timeout($this->sock, 20);
        try {
            $greeting = $this->read();
            if ((int) substr($greeting, 0, 3) !== 220) throw new RuntimeException('greeting -> ' . $greeting);
            $this->cmd('EHLO switchops.tech', [250]);
            if ($secure === 'tls') {
                $this->cmd('STARTTLS', [220]);
                if (!stream_socket_enable_crypto($this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS handshake failed');
                $this->cmd('EHLO switchops.tech', [250]);
            }
            $this->cmd('AUTH LOGIN', [334]);
            $this->cmd(base64_encode($c['username']), [334], true);
            $this->cmd(base64_encode($c['password']), [235], true);
            $this->cmd('MAIL FROM:<' . FROM_EMAIL . '>', [250]);
            $this->cmd('RCPT TO:<' . $to . '>', [250, 251]);
            $this->cmd('DATA', [354]);
            $data = str_replace(["\r\n", "\r"], "\n", $headers . "\n\n" . $body);
            $data = preg_replace('/^\./m', '..', $data);                       // dot-stuffing
            $this->cmd(str_replace("\n", "\r\n", $data) . "\r\n.", [250]);
            @fwrite($this->sock, "QUIT\r\n");
        } finally {
            fclose($this->sock);
        }
    }
}

/** Builds headers and sends via SMTP (or mail() if no config). Throws on failure. */
function deliver(?array $smtp, string $to, string $subject, string $body, string $replyTo, string $fromName): void
{
    $domain = 'switchops.tech';
    $headers = [
        'Date: ' . date('r'),
        'From: ' . mb_encode_mimeheader($fromName, 'UTF-8') . ' <' . FROM_EMAIL . '>',
        'To: <' . $to . '>',
        'Reply-To: ' . $replyTo,
        'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: SwitchOps-Contact-Form',
    ];
    if ($smtp) {
        (new Smtp($smtp))->send($to, implode("\n", $headers), $body);
        return;
    }
    // Fallback: PHP mail() (no Subject/To/Date in extra headers; mail() adds them).
    $extra = array_values(array_filter($headers, static fn ($h) => !preg_match('/^(To|Subject|Date):/', $h)));
    if (!mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $extra), '-f' . FROM_EMAIL)) {
        throw new RuntimeException('mail() returned false');
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Method not allowed.', 405);
}

// Spam traps. Bots get a normal-looking success so they don't adapt (but it is logged).
if (trim((string) ($_POST['sx_hp'] ?? '')) !== '') {
    log_event('blocked:honeypot');
    respond(true, 'Thank you for your message. Our team will be in touch shortly.');
}
$started = (int) ($_POST['started'] ?? 0);
if ($started > 0 && (time() - intdiv($started, 1000)) < MIN_FILL_SECS) {
    log_event('blocked:too-fast');
    respond(true, 'Thank you for your message. Our team will be in touch shortly.');
}

// Per-IP rate limit, kept in a small file in the server's temp directory.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/switchops_contact_' . hash('sha256', $ip) . '.json';
$now = time();
$recent = [];
if (is_file($rateFile)) {
    $recent = array_filter(
        (array) json_decode((string) file_get_contents($rateFile), true),
        static fn ($t) => is_int($t) && $t > $now - 3600
    );
}
if (count($recent) >= MAX_PER_HOUR) {
    log_event('blocked:rate-limit');
    respond(false, 'Too many messages from your connection. Please try again later or email ' . TO_EMAIL . '.', 429);
}

// Validate.
$name     = field('name', 100);
$email    = field('email', 160);
$company  = field('company', 150);
$interest = field('interest', 60);
$message  = trim(mb_substr((string) ($_POST['message'] ?? ''), 0, 5000));

if ($name === '' || $email === '' || $message === '') {
    respond(false, 'Please fill in your name, email, and message.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.', 422);
}
// The domain must exist and be able to receive mail. Stops spam bots using made-up
// lookalike domains (e.g. "search-switchops.tech"), whose confirmations would bounce
// and harm the mailbox's sending reputation.
$emailDomain = rtrim(substr(strrchr($email, '@'), 1), '.') . '.';
if (!checkdnsrr($emailDomain, 'MX') && !checkdnsrr($emailDomain, 'A') && !checkdnsrr($emailDomain, 'AAAA')) {
    log_event('blocked:bad-domain');
    respond(false, 'That email address does not look reachable. Please check it, or email us directly at ' . TO_EMAIL . '.', 422);
}
if (($_POST['consent'] ?? '') !== 'yes') {
    respond(false, 'Please confirm that you agree to the Terms and Conditions and Privacy Policy.', 422);
}
if (mb_strlen($message) < 10) {
    respond(false, 'Please add a little more detail to your message.', 422);
}
if (!in_array($interest, INTERESTS, true)) {
    $interest = 'Something else';
}

$config = is_file(CONFIG_FILE) ? require CONFIG_FILE : null;
$smtp = (is_array($config) && !empty($config['password']) && $config['password'] !== 'PASTE-MAILBOX-PASSWORD-HERE') ? $config : null;
$via = $smtp ? 'smtp' : 'mail()';

// 1. Notify the team.
$subject = 'New enquiry: ' . $interest . ' from ' . $name;
$body = implode("\n", [
    'New message from the SwitchOps Tech website contact form.',
    '',
    'Name:        ' . $name,
    'Email:       ' . $email,
    'Company:     ' . ($company !== '' ? $company : '-'),
    'Interest:    ' . $interest,
    '',
    'Message:',
    $message,
    '',
    'Agreement:   Terms and Conditions v' . LEGAL_VERSION . ' and Privacy Policy v' . LEGAL_VERSION . ', accepted ' . gmdate('Y-m-d H:i:s') . ' UTC',
    '',
    '--',
    'Sent ' . gmdate('Y-m-d H:i') . ' UTC from ' . $ip,
    'Reply to this email to respond directly to ' . $name . '.',
]);
try {
    deliver($smtp, TO_EMAIL, $subject, $body, $email, FROM_NAME);
    log_event('sent:team', "via $via");
} catch (Throwable $e) {
    log_event('FAILED:team', "via $via: " . $e->getMessage());
    respond(false, 'Your message could not be sent right now. Please email us directly at ' . TO_EMAIL . '.', 500);
}

$recent[] = $now;
@file_put_contents($rateFile, json_encode(array_values($recent)), LOCK_EX);

// 2. Confirmation to the visitor. Fixed wording only (nothing they typed is echoed back),
//    so the form can't be used to send arbitrary text to other people.
if (($config['send_confirmation'] ?? true) !== false) {
    $confirm = implode("\n", [
        'Hello,',
        '',
        'Thank you for contacting SwitchOps Tech. We have received your enquiry about "' . $interest . '",',
        'and our team will get back to you within 1 to 2 business days.',
        '',
        'If you need to add anything, simply reply to this email.',
        '',
        'Kind regards,',
        'SwitchOps Tech',
        'https://switchops.tech',
        '',
        '--',
        'You are receiving this because this email address was entered in the contact form at switchops.tech.',
        'If that was not you, no action is needed and you will not hear from us again.',
    ]);
    try {
        deliver($smtp, $email, 'We received your message | SwitchOps Tech', $confirm, TO_EMAIL, 'SwitchOps Tech');
        log_event('sent:confirmation', "via $via");
    } catch (Throwable $e) {
        log_event('FAILED:confirmation', "via $via: " . $e->getMessage());   // the enquiry itself was delivered
    }
}

respond(true, 'Thank you for your message. Our team will be in touch shortly. A confirmation has been sent to your email.');
