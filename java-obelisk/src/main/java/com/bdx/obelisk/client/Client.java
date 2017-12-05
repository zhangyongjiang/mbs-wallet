package com.bdx.obelisk.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Client {
	
	final static Logger LOG = LoggerFactory.getLogger(Client.class);
	
	private ClientBase clientBase;
	
	private Subscriber subscriber;
	
	private Blockchain blockchain;
	
	private Protocol protocol;
	
	private TransactionPool transactionPool;
	
	public Client(String connection){
		clientBase = new ClientBase(connection);
		clientBase.setup();
		subscriber = new Subscriber(clientBase);
		blockchain = new Blockchain(clientBase);
		protocol = new Protocol(clientBase);
		transactionPool = new TransactionPool(clientBase);
	}
	
	public Client(ClientBase clientBase){
		this.clientBase = clientBase;
		subscriber = new Subscriber(clientBase);
		blockchain = new Blockchain(clientBase);
		protocol = new Protocol(clientBase);
		transactionPool = new TransactionPool(clientBase);
	}
	
	public Subscriber getSubscriber() {
		return subscriber;
	}

	public Blockchain getBlockchain() {
		return blockchain;
	}
	
	public Protocol getProtocol() {
		return protocol;
	}

	public TransactionPool getTransactionPool() {
		return transactionPool;
	}
	
	public void destroy(){
		subscriber.destroy();
		clientBase.destroy();
	}
}
