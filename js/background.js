/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 **/

chrome.storage.local.set({'source_script': 'http://magento.dev/source.php'});
chrome.storage.local.set({'listening_ip': '192.168.56.1'});

function onLaunched(launchData) {
  chrome.app.window.create('main.html', {
    width: 800,
    height: 800,
	type: 'panel'
  });
}

chrome.app.runtime.onLaunched.addListener(onLaunched);

