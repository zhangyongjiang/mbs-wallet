#!/usr/bin/python
import serial
import binascii

ser = serial.Serial('/dev/ttyACM0', 115200)
num = '012345678'
dat = '.dat'
name = 'dev0_stm32_rng_'
for j in range(1, 8) :
    filename = name + num[j] + dat
    print filename
    f = open(filename, 'wb')
    for i in xrange(65536):
	ser.write("\n")
	x = ser.read(32)
	f.write(binascii.unhexlify(x))

ser.close()
