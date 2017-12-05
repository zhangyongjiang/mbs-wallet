#!/bin/bash
mvn clean package
pack200 --repack target/bwallet-applet-0.0.3.jar
jarsigner -keystore keystore/bwallet.store -storepass password -keypass password -tsa https://timestamp.geotrust.com/tsa target/bwallet-applet-0.0.3.jar bwallet
jarsigner -verify target/bwallet-applet-0.0.3.jar
pack200 target/bwallet-applet-0.0.3.jar.pack.gz target/bwallet-applet-0.0.3.jar
unpack200 target/bwallet-applet-0.0.3.jar.pack.gz target/bwallet-applet-unpack.jar
jarsigner -verify target/bwallet-applet-unpack.jar