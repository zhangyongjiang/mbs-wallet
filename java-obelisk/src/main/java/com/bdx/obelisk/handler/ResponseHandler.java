package com.bdx.obelisk.handler;

import com.google.common.util.concurrent.SettableFuture;

public interface ResponseHandler {
	
	void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId);
	
}
