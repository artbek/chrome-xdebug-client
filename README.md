# Xdebug Chrome App

<img src="https://github.com/artbek/chrome-xdebug-client/blob/master/img/screenshot.png" />

### Features:

- stepping through code,
- setting breakpoints,
- viewing stack backtrace,
- evaluating expressions.

### How to get started:

1. Install the app: <a href="https://chrome.google.com/webstore/detail/xdebug/nhodjblplijafdpjjfhhanfmchplpfgl?hl=en-GB&gl=GB" target="blank">Google Webstore</a> or `chrome://extensions/` and 'Load unpacked extension...' button.
2. Make sure you have supplied a reachable Listening IP in the app's settings.
3. Press Listen.
4. Run your code, e.g.:

```
http://artbek.co.uk?XDEBUG_SESSION_START=xxx (should work without xxx value)
```
or

```
> export XDEBUG_CONFIG="idekey=xxx remote_host=123.123.123.123" (should work without idekey=xxx part)
> php myscript.php
```

