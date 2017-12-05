#!/bin/bash

set -e
cd `dirname $0`

sudo rm -rf ../../../../mybwallet.com/www-old
sudo touch ../../../../mybwallet.com/www
sudo mv ../../../../mybwallet.com/www ../../../../mybwallet.com/www-old
sudo cp -r dist ../../../../mybwallet.com/www
sudo chown -R www-data:www-data ../../../../mybwallet.com/www

echo "DONE"
