package com.bdx.bwallet.misc;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

public class IOUtils {
	/**
     * Convert the specified string to an input stream, encoded as bytes
     * using the default character encoding of the platform.
     *
     * @param input the string to convert
     * @return an input stream
     * @since Commons IO 1.1
     */
    public static InputStream toInputStream(String input) {
        byte[] bytes = input.getBytes();
        return new ByteArrayInputStream(bytes);
    }
}
