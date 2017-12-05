package com.bdx.obelisk.client;

import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.ArrayUtils;
import org.bitcoinj.core.Address;
import org.bitcoinj.core.AddressFormatException;
import org.bitcoinj.core.Transaction;
import org.bitcoinj.core.WrongNetworkException;
import org.bitcoinj.params.MainNetParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.bdx.obelisk.client.ClientBase.SocketEventListener;
import com.bdx.obelisk.exception.ObeliskException;
import com.bdx.obelisk.filter.ResponseFilter;
import com.bdx.obelisk.handler.FetchHistoryHandler;
import com.bdx.obelisk.handler.RenewHandler;
import com.bdx.obelisk.handler.ResponseHandler;
import com.google.common.util.concurrent.SettableFuture;

public class Subscriber implements ResponseFilter {

	public final static int ERROR_CODE_SIZE = 4;

	public final static int ADDRESS_VERSION_SIZE = 1;

	public final static int ADDRESS_HASH_SIZE = 20;

	public final static int HEIGHT_SIZE = 4;

	public final static int BLOCK_HASH_SIZE = 32;

	public final static int ADDRESS_VERSION = 0x05;

	final static Logger LOG = LoggerFactory.getLogger(Subscriber.class);

	private ClientBase clientBase;

	private Listener globalListener;

	private Map<Address, Listener> listeners = new ConcurrentHashMap<Address, Listener>();

	private Map<Integer, Set<Address>> listeningAddresses = new ConcurrentHashMap<Integer, Set<Address>>();

	public Subscriber(ClientBase clientBase) {
		clientBase.appendFilter("address.update", this);
		clientBase.appendGlobalHandler("address.fetch_history", new FetchHistoryHandler());
		clientBase.appendGlobalHandler("address.renew", new RenewHandler());
		clientBase.setSocketEventListener(new SocketEventListener() {
			public void onRemove(Integer socketId) {
				// remove socketId from listeningAddresses
				Set<Address> addresses = listeningAddresses.remove(socketId);
				Iterator<Address> iterator = addresses.iterator();
				while (iterator.hasNext()) {
					Address addr = iterator.next();
					Listener listener = listeners.get(addr);
					if (listener != null) {
						listener.onSocketRemove(socketId);
					}
				}
			}
		});
		this.clientBase = clientBase;
		setupThreads();
	}

	protected void setupThreads() {
	}

	protected byte[] addressToBytes(Address address) {
		ByteBuffer byteBuffer = ByteBuffer.allocate(ADDRESS_VERSION_SIZE
				+ ADDRESS_HASH_SIZE);
		byteBuffer.put((byte) address.getVersion());
		byte[] addressHash = ArrayUtils.clone(address.getHash160());
		ArrayUtils.reverse(addressHash);
		byteBuffer.put(addressHash);
		return byteBuffer.array();
	}
	
	/**
	 * process for 'address.update' response
	 * 
	 * @throws
	 */
	public void doFilter(byte[] data) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);

		// [ addr,version ] (1 byte)
		byte addressVersion = byteBuffer.get();

		// [ addr.hash ] (20 bytes)
		byte[] addressHash = new byte[ADDRESS_HASH_SIZE];
		byteBuffer.get(addressHash);
		ArrayUtils.reverse(addressHash);

		// [ height ] (4 bytes)
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		final long height = EndianUtils.readSwappedUnsignedInteger(bytes4, 0);

		// [ block_hash ] (32 bytes)
		final byte[] blockHash = new byte[BLOCK_HASH_SIZE];
		byteBuffer.get(blockHash);
		ArrayUtils.reverse(blockHash);

		// [ tx ]
		final byte[] txBytes = new byte[data.length
				- (ADDRESS_VERSION_SIZE + ADDRESS_HASH_SIZE + HEIGHT_SIZE + BLOCK_HASH_SIZE)];
		byteBuffer.get(txBytes);

		Address addr = null;
		try {
			addr = new Address(MainNetParams.get(), addressVersion, addressHash);
		} catch (WrongNetworkException e) {
			e.printStackTrace();
		}

		if (addr == null)
			return;

		Listener listener = listeners.get(addr);

		if (listener == null)
			listener = globalListener;

		Transaction tx = new Transaction(MainNetParams.get(), txBytes);

		if (listener != null)
			listener.onUpdate(addr, height, blockHash, tx);
	}

	public void unsubscribe(Address address, Integer socketId) {
		// fast unsubscribe
		Set<Address> addresses = listeningAddresses.get(socketId);
		addresses.remove(address);
		listeners.remove(address);
	}
	
	public void unsubscribe(Address address) {
		// slow unsubscribe
		Iterator<Set<Address>> setIterator = listeningAddresses.values().iterator();
		while (setIterator.hasNext()) {
			Set<Address> set = setIterator.next();
			if (set.remove(address))
				break;
		}
		listeners.remove(address);
	}

	public Future<Object> subscribe(Address addr) {
		return this.subscribe(addr, null);
	}

	public Future<Object> subscribe(String address) {
		return this.subscribe(address, null);
	}

	public Future<Object> subscribe(final Address addr, final Listener listener) {
		Future<Object> f = clientBase.request("address.subscribe", addressToBytes(addr), new ResponseHandler() {
			public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
				try {
					ByteBuffer byteBuffer = ByteBuffer.wrap(data);
					byte[] bytes4 = new byte[4];
					byteBuffer.get(bytes4);
					int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
					if (code == 0) {
						Set<Address> addresses = listeningAddresses.get(socketId);
						if (addresses == null) {
							addresses = Collections.synchronizedSet(new HashSet<Address>());
							listeningAddresses.put(socketId, addresses);
						}
						addresses.add(addr);
	
						if (listener != null)
							listeners.put(addr, listener);
	
						future.set(socketId);
					} else {
						future.setException(new ObeliskException(code));
					}
				} catch (Exception e) {
					future.setException(e);
				}
			}
		});
		return f;
	}

	public Future<Object> subscribe(String address, final Listener updateListener) {
		Address addr = null;
		try {
			addr = new Address(MainNetParams.get(), address);
		} catch (AddressFormatException e) {
			throw new RuntimeException(e);
		}
		return this.subscribe(addr, updateListener);
	}

	public Future<Object> renew(final Address addr, Integer socketId) {
		Future<Object> future = clientBase.request("address.renew", addressToBytes(addr), null, socketId);
		return future;
	}
	
	public Future<Object> fetchHistory(Address addr, int fromHeight, FetchHistoryHandler handler) {
		byte[] hash160 = ArrayUtils.clone(addr.getHash160());
		ArrayUtils.reverse(hash160);
		ByteBuffer byteBuffer = ByteBuffer.allocate(ADDRESS_VERSION_SIZE + ADDRESS_HASH_SIZE + HEIGHT_SIZE);
		byteBuffer.put((byte) addr.getVersion());
		byteBuffer.put(hash160);
		
		byte[] bytes = new byte[4];
		EndianUtils.writeSwappedInteger(bytes, 0, fromHeight);
		byteBuffer.put(bytes);
		
		Future<Object> f = clientBase.request("address.fetch_history", byteBuffer.array(), handler);
		return f;
	}

	public Future<Object> fetchHistory(String address, int fromHeight, FetchHistoryHandler handler) {
		Address addr = null;
		try {
			addr = new Address(MainNetParams.get(), address);
		} catch (AddressFormatException e) {
			throw new RuntimeException(e);
		}
		return this.fetchHistory(addr, fromHeight, handler);
	}

	public Future<Object> fetchHistory(Address addr, int fromHeight) {
		return this.fetchHistory(addr, fromHeight, null);
	}

	public Future<Object> fetchHistory(String address, int fromHeight) {
		Address addr = null;
		try {
			addr = new Address(MainNetParams.get(), address);
		} catch (AddressFormatException e) {
			throw new RuntimeException(e);
		}
		return this.fetchHistory(addr, fromHeight);
	}

	public void destroy() {
	}

	public interface Listener {
		void onUpdate(Address addr, long height, byte[] blockHash, Transaction tx);
		void onSocketRemove(Integer socketId);
	}

	public void setGlobalListener(Listener globalListener) {
		this.globalListener = globalListener;
	}

}
