#!/bin/bash

sudo rm -rf ../../../../mybwallet.com/docs/plugin-guide-en/html
sudo cp -r _build/html ../../../../mybwallet.com/docs/plugin-guide-en/
sudo chown -R www-data:www-data ../../../../mybwallet.com/docs/plugin-guide-en 

echo "DONE" 
