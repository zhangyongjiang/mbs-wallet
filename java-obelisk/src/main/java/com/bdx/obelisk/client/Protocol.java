package com.bdx.obelisk.client;

import java.util.concurrent.Future;

import com.bdx.obelisk.handler.BroadcastHandler;

public class Protocol {

	private ClientBase clientBase;

	public Protocol(ClientBase clientBase) {
		clientBase.appendGlobalHandler("protocol.broadcast_transaction", new BroadcastHandler());
		this.clientBase = clientBase;
	}

	public Future<Object> broadcastTransaction(byte[] tx) {
		Future<Object> f = clientBase.request("protocol.broadcast_transaction", tx, null);
		return f;
	}

}
