# Xdebug Chrome App

<img src="https://github.com/artbek/chrome-xdebug-client/blob/master/img/screenshot.png" />

### Features:

- stepping through code,
- setting breakpoints,
- viewing stack backtrace,
- evaluating expressions.

### How to get started:

1. Install the app: <a href="https://chrome.google.com/webstore/detail/xdebug/nhodjblplijafdpjjfhhanfmchplpfgl?hl=en-GB&gl=GB" target="blank">Google Webstore</a> or go to `chrome://extensions/` and use 'Load unpacked extension...' button.
2. Press Listen.
3. Run your code, e.g.:

```
http://artbek.co.uk?XDEBUG_SESSION_START=xxx
(should work without 'xxx' value, but use it if you want 'XDEBUG_SESSION' cookie to be created)
```
or

```
> export XDEBUG_CONFIG="remote_host=0.0.0.0" ('remote_host=0.0.0.0' is optional)
> php myscript_1.php
> php myscript_2.php
```
or

```
> XDEBUG_CONFIG="" php myscript.php
```

