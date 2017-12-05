package com.bdx.bwallet.applet;

import java.applet.Applet;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import netscape.javascript.JSObject;

import org.hid4java.HidDevice;
import org.hid4java.HidDeviceInfo;
import org.hid4java.HidException;
import org.hid4java.HidServices;
import org.hid4java.jna.HidApi;

import com.bdx.bwallet.misc.IOUtils;
import com.cedarsoftware.util.io.JsonReader;
import com.cedarsoftware.util.io.JsonWriter;
import com.google.protobuf.Message;
import com.googlecode.protobuf.format.JsonFormat;
import com.sun.jna.WString;

public class BWalletApplet extends Applet {

	private static final long serialVersionUID = 1L;

	static final int VENDOR_ID = 0x534c;

	static final int PRODUCT_ID = 0x01;

	private HidServices hidServices;

	private Map<String, HidDevice> devices = new ConcurrentHashMap<String, HidDevice>();

	//private ObjectMapper mapper = new ObjectMapper();

	private JsonFormat jsonFormat = new JsonFormat();

	public final String version = "0.0.2";

	private ExecutorService executor = Executors.newSingleThreadExecutor();
	
	@Override
	public void init() {
		//mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

		boolean loaded = AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
			@Override
			public Boolean run() {
				try {
					hidServices = new HidServices(false);
					return true;
				} catch (HidException e) {
					e.printStackTrace();
				}
				return false;
			}
		});

		String onload = this.getParameter("onload");
		if (loaded && (onload != null && !onload.equals(""))) {
			JSObject window = JSObject.getWindow(this);
			window.call(onload, null);
		}

		super.init();
	}

	public void configure(String config) {
	}

	public synchronized String devices() {
		final List<MockHidDeviceInfo> deviceInfos = new ArrayList<MockHidDeviceInfo>();
		AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
			@Override
			public Boolean run() {
				try {
					for (HidDeviceInfo hidDeviceInfo : hidServices.getAttachedHidDevices()) {
						if (hidDeviceInfo.getVendorId() == VENDOR_ID && hidDeviceInfo.getProductId() == PRODUCT_ID) {
							System.out.println("BWalletApplet [debug] serialNumber : " + hidDeviceInfo.getSerialNumber());
							// windows will return the incomplete HidDeviceInfo when unpulug the bwallet 
							if (hidDeviceInfo.getSerialNumber() != null) {
								HidDevice device = devices.get(hidDeviceInfo.getSerialNumber().toString());
								if (device == null) {
									device = hidServices.getHidDevice(VENDOR_ID, PRODUCT_ID, hidDeviceInfo.getSerialNumber().toString());
									// device maybe open by the other applet.
									if (device != null)
										devices.put(hidDeviceInfo.getSerialNumber().toString(), device);
								}
								deviceInfos.add(toMock(hidDeviceInfo));
							}
						}
					}
					return true;
				} catch (Throwable ex) {
					ex.printStackTrace();
				}
				return false;
			}
		});

		String json = AccessController.doPrivileged(new PrivilegedAction<String>() {
			@Override
			public String run() {
				String j = null;
				try {
					//j = mapper.writeValueAsString(deviceInfos);
					j = JsonWriter.objectToJson(deviceInfos.toArray());
				} catch (Exception e) {
					e.printStackTrace();
				}
				return j;
			}
		});

		if (json == null)
			json = "[]";

		return json;
	}

	protected MockHidDeviceInfo toMock(HidDeviceInfo hidDeviceInfo) {
		MockHidDeviceInfo mock = new MockHidDeviceInfo();
		mock.setPath(hidDeviceInfo.getPath());
		mock.setVendorId(hidDeviceInfo.getVendorId());
		mock.setProductId(hidDeviceInfo.getProductId());
		mock.setSerialNumber(hidDeviceInfo.getSerialNumber() != null ? hidDeviceInfo.getSerialNumber().toString() : null);
		mock.setReleaseNumber(hidDeviceInfo.getReleaseNumber());
		mock.setManufacturerString(hidDeviceInfo.getManufacturerString() != null ? hidDeviceInfo.getManufacturerString().toString() : null);
		mock.setProductString(hidDeviceInfo.getProductString() != null ? hidDeviceInfo.getProductString().toString() : null);
		mock.setUsagePage(hidDeviceInfo.getUsagePage());
		mock.setUsage(hidDeviceInfo.getUsage());
		mock.setInterfaceNumber(hidDeviceInfo.getInterfaceNumber());
		return mock;
	}
	
	protected HidDeviceInfo fromMock(MockHidDeviceInfo mock) {
		HidDeviceInfo hidDeviceInfo = new HidDeviceInfo();
		hidDeviceInfo.setPath(mock.getPath());
		hidDeviceInfo.setVendorId(mock.getVendorId());
		hidDeviceInfo.setProductId(mock.getProductId());
		hidDeviceInfo.setSerialNumber(mock.getSerialNumber() != null ? new WString(mock.getSerialNumber()) : null);
		hidDeviceInfo.setReleaseNumber(mock.getReleaseNumber());
		hidDeviceInfo.setManufacturerString(mock.getManufacturerString() != null ? new WString(mock.getManufacturerString()) : null);
		hidDeviceInfo.setProductString(mock.getProductString() != null ? new WString(mock.getProductString()) : null);
		hidDeviceInfo.setUsagePage(mock.getUsagePage());
		hidDeviceInfo.setUsage(mock.getUsage());
		hidDeviceInfo.setInterfaceNumber(mock.getInterfaceNumber());
		return hidDeviceInfo;
	}
	
	public synchronized void close(final String jsonDevice, JSObject callbacks) {
		HidDeviceInfo deviceInfo = AccessController.doPrivileged(new PrivilegedAction<HidDeviceInfo>() {
			@Override
			public HidDeviceInfo run() {
				HidDeviceInfo d = null;
				try {
					//d = mapper.readValue(jsonDevice, HidDeviceInfo.class);
					MockHidDeviceInfo mock = (MockHidDeviceInfo) JsonReader.jsonToJava(jsonDevice);
					d = fromMock(mock);
				} catch (Exception e) {
					e.printStackTrace();
				}
				return d;
			}
		});

		if (deviceInfo != null) {
			final HidDevice device = devices.remove(deviceInfo.getSerialNumber().toString());
			if (device != null) {
				boolean closed = AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
					@Override
					public Boolean run() {
						device.close();
						return true;
					}
				});
				if (closed) {
					callbacks.call("success", null);
					return;
				}
			}
		}
		callbacks.call("error", null);
	}

	public void call(final String jsonDevice, boolean timeout, final String type, final String jsonMessage, final JSObject callbacks) {
		final HidDeviceInfo deviceInfo = AccessController.doPrivileged(new PrivilegedAction<HidDeviceInfo>() {
			@Override
			public HidDeviceInfo run() {
				HidDeviceInfo d = null;
				try {
					//d = mapper.readValue(jsonDevice, HidDeviceInfo.class);
					MockHidDeviceInfo mock = (MockHidDeviceInfo) JsonReader.jsonToJava(jsonDevice);
					d = fromMock(mock);
				} catch (Exception e) {
					e.printStackTrace();
				}
				return d;
			}
		});
		
		Runnable task = new Runnable(){
			@Override
			public void run() {
				if (deviceInfo != null) {
					final HidDevice device = devices.get(deviceInfo.getSerialNumber().toString());

					if (device != null) {
						try {
							AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
								@Override
								public Boolean run() {
									Message message = null;
									try {
										Message.Builder builder = MessageUtils.getMessageBuilder(type);
										jsonFormat.merge(IOUtils.toInputStream(jsonMessage), builder);
										message = builder.build();
									} catch (Exception e) {
										e.printStackTrace();
										throw new IllegalStateException("Invalid message.");
									}

									HidMessageUtils.writeMessage(device, message);
									return true;
								}
							});

							String[] response = AccessController.doPrivileged(new PrivilegedAction<String[]>() {
								@Override
								public String[] run() {
									Message message = HidMessageUtils.readFromDevice(device);
									String _type = null;
									String _json = null;
									if (message != null) {
										_type = MessageUtils.getMessageName(message);
										_json = jsonFormat.printToString(message);
									}
									return new String[] { _type, _json };
								}
							});
							
							callbacks.call("success", new Object[] { response[0], response[1] });
						} catch (Exception ex) {
							ex.printStackTrace();
							callbacks.call("error", new Object[] { ex.getMessage() });
						}
					} else {
						// device open by the other application.
						callbacks.call("error", new Object[] { "Opening device failed" });
					}
				} else {
					callbacks.call("error", new Object[] { "Device not found" });
				}
			}
		};
		executor.submit(task);
	}

	@Override
	public void destroy() {
		try {
			executor.shutdownNow();
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
			@Override
			public Boolean run() {
				for (HidDevice device : devices.values()) {
					device.close();
				}
				// fix the JVM crash error on mac osx after refresh page
				HidApi.exit();
				return true;
			}
		});

		devices = null;
		hidServices = null;

		super.destroy();
	}
	
	public static void main(String[] args) {
		System.out.println("bwallet applet");
	}

}
