package com.bdx.obelisk.message;

import org.apache.commons.io.EndianUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.zeromq.ZMQ;
import org.zeromq.ZMsg;

public class ResponseMessage {

	final static Logger LOG = LoggerFactory.getLogger(ResponseMessage.class);
	
	private long id;
	private String command;
	private byte[] data;

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
	
	public boolean recv(ZMQ.Socket socket){
		assert socket != null;
		try{
			ZMsg msg = ZMsg.recvMsg(socket);
			
			if (msg == null || msg.size() < 3){
				return false;
			}
			
			this.command = msg.popString();
			
			long id = EndianUtils.readSwappedUnsignedInteger(msg.pop().getData(), 0);
			this.id = id;
			
			this.data= msg.pop().getData();
			
			msg.destroy();
			
			if (LOG.isDebugEnabled())
				LOG.debug("received command - " + command);
			
			return true;
		} catch (Error ex){
			ex.printStackTrace();
		}
		
		return false;
	}

}
