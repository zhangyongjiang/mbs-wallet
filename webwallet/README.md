# Bitcoin web wallet with BWallet support

Bitcoin web wallet using Bitcoin BWallet as a private key storage.

## Installation

	sudo npm install -g grunt-cli bower
	git clone git@github.com:bwallet/webwallet.git
	cd webwallet
	git submodule update --recursive --init
	bower install
	npm install

## Configuration

Copy `app/scripts/config.sample.js` to `app/scripts/config.js` and adjust to
your needs (i.e. point backend URIs to your own server or change the
location of signed plugin configuration).

## Run development server

To run web wallet locally, please make sure your hosts file includes
the following line:

    127.0.0.1 localhost.mybwallet.com

Afterwards you can run the local server. It'll be available on
`http://localhost.mybwallet.com:8000`:

    grunt server

## Build production package

	grunt build
	cp -r app/data dist/data
