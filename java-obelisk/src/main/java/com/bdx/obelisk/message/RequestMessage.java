package com.bdx.obelisk.message;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.math.JVMRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.zeromq.ZMQ;

public class RequestMessage {

	final static Logger LOG = LoggerFactory.getLogger(RequestMessage.class);

	final static long UINT32_MAX_VALUE = (long) Integer.MAX_VALUE
			+ Integer.MAX_VALUE + 1;

	private long id;
	private String command;
	private byte[] data;

	public RequestMessage(String command, byte[] data) {
		this.command = command;
		this.data = data;
		this.id = JVMRandom.nextLong(UINT32_MAX_VALUE);
	}

	public long getId() {
		return id;
	}

	public void setId(long id) {
		this.id = id;
	}

	public String getCommand() {
		return command;
	}

	public void setCommand(String command) {
		this.command = command;
	}

	public byte[] getData() {
		return data;
	}

	public void setData(byte[] data) {
		this.data = data;
	}

	public boolean send(ZMQ.Socket socket) {
		assert socket != null;

		byte[] idBytes = new byte[4];
		EndianUtils.writeSwappedInteger(idBytes, 0, (int) id);

		if (LOG.isDebugEnabled())
			LOG.debug("sending command - " + command);

		boolean s1 = socket.send(command, ZMQ.SNDMORE + ZMQ.NOBLOCK); // ZMQ.NOBLOCK
		boolean s2 = socket.send(idBytes, ZMQ.SNDMORE + ZMQ.NOBLOCK);
		boolean s3 = socket.send(data, ZMQ.NOBLOCK);

		if (s1 && s2 && s3) {
			return true;
		}

		return false;
	}

}
