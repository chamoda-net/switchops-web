<?php
/**
 * SwitchOps Tech contact form: mailbox settings.
 *
 * UPLOAD THIS FILE ONE FOLDER ABOVE public_html (next to it, NOT inside it),
 * so it can never be opened in a browser. In Hostinger File Manager that is the
 * folder that contains public_html (e.g. domains/switchops.tech/).
 *
 * Then replace PASTE-MAILBOX-PASSWORD-HERE with the password of the
 * contact@switchops.tech mailbox (hPanel > Emails > contact@switchops.tech).
 */
return [
    'host'              => 'smtp.hostinger.com',
    'port'              => 465,
    'secure'            => 'ssl',                          // 465 = ssl; use 587 with 'tls' if 465 is blocked
    'username'          => 'contact@switchops.tech',
    'password'          => 'PASTE-MAILBOX-PASSWORD-HERE',
    'send_confirmation' => true,                           // confirmation email to the person who wrote in
];
