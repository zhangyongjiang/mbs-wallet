#!/bin/bash

sudo rm -rf ../../../../mybwallet.com/docs/plugin-guide-zh/html
sudo cp -r _build/html ../../../../mybwallet.com/docs/plugin-guide-zh/
sudo sed -i "s/https:\/\/fonts.googleapis.com/http:\/\/fonts.useso.com/g" `grep https://fonts.googleapis.com -rl ../../../../mybwallet.com/docs/plugin-guide-zh/html`
sudo chown -R www-data:www-data ../../../../mybwallet.com/docs/plugin-guide-zh 

echo "DONE" 
