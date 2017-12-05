package com.bdx.obelisk.client;

import com.bdx.obelisk.message.RequestMessage;

public class Request {

	private RequestMessage message;
	private int retriesLeft;
	private long timestamp;
	private long timeout;

	public Request(RequestMessage message, int retriesLeft, long timestamp,
			long timeout) {
		this.message = message;
		this.retriesLeft = retriesLeft;
		this.timestamp = timestamp;
		this.timeout = timeout;
	}

	public Request(RequestMessage message, long timestamp) {
		this.message = message;
		this.timestamp = timestamp;
	}
	
	public RequestMessage getMessage() {
		return message;
	}

	public void setMessage(RequestMessage message) {
		this.message = message;
	}

	public int getRetriesLeft() {
		return retriesLeft;
	}

	public void setRetriesLeft(int retriesLeft) {
		this.retriesLeft = retriesLeft;
	}

	public long getTimestamp() {
		return timestamp;
	}

	public void setTimestamp(long timestamp) {
		this.timestamp = timestamp;
	}

	public long getTimeout() {
		return timeout;
	}

	public void setTimeout(long timeout) {
		this.timeout = timeout;
	}

}
