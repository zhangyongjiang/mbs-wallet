'use strict';

var messages = {
	chinese : {
		"Device not initialized or passphrase request cancelled" : "设备未初始化或已取消输入密码",
		"Invalid signature" : "无效的签名",
		"Not enough funds" : "资金不足",
		"PIN Cancelled" : "PIN码输入已取消",
		"Invalid PIN" : "PIN码错误",
		"PIN removal cancelled" : "PIN码删除已取消",
		"Ping cancelled" : "Ping已取消",
		"PIN change cancelled" : "PIN码修改已取消",
		"PIN change failed" : "PIN码修改失败",
		"Wipe cancelled" : "重置已取消",
		"Entropy cancelled" : "Entropy已取消",
		"Fee over threshold. Signing cancelled." : "手续费超过阈值。签名已取消。",
		"Signing cancelled by user" : "签名已取消",
		"Apply settings cancelled" : "修改标签与语言已取消",
		"Show address cancelled" : "地址显示已取消",
		"Sign message cancelled" : "签名消息已取消",
		"Load cancelled" : "加载已取消",
		"CipherKeyValue cancelled" : "CipherKeyValue已取消",
		"Reset cancelled" : "设置已取消",
		"Not in bootloader mode" : "不在升级模式",
		"Device is already initialized. Use Wipe first." : "设备已经初始化。请先重置设备。",
		"Unknown message" : "消息不可识别",
		"Not in Recovery mode" : "不在恢复模式",
		"Not in Reset mode" : "不在设置模式",
		"Not in Signing mode" : "不在签名模式",
		"No transaction provided" : "没有提供交易",
		"No key provided" : "没有提供键",
		"No value provided" : "没有提供值",
		"Value length must be a multiple of 16" : "值的长度必须是16的倍数",
		"No setting provided" : "没有提供配置",
		"No public key provided" : "没有提供公钥",
		"Invalid public key provided" : "提供的公钥无效",
		"No message provided" : "没有提供消息",
		"Message length must be a multiple of 16" : "消息长度必须是16的倍数",
		"Message too big" : "消息长度过大",
		"Invalid word count (has to be 12, 18 or 24 bits)" : "无效的单词数量（必须是12、18或24个）",
		"Wrong word retyped" : "单词输入错误",
		"Word not found in a wordlist" : "单词表中不存在的单词",
		"Invalid mnemonic, are words in correct order?" : "无效的种子，单词排列顺序是否正确？",
		"Invalid strength (has to be 128, 192 or 256 bits)" : "无效的强度（必须是128、192或256位）",
		"Failed to serialize input" : "系列化输入失败",
		"Failed to serialize output" : "系列化输出失败",
		"Encountered invalid prevhash" : "无效的prevhash",
		"Failed to compile input" : "编制输入失败",
		"Only one change output allowed" : "只允许一个找零输出",
		"Transaction has changed during signing" : "签名期间交易已经改变了",
		"Failed to compile output" : "编制输出失败",
		"Signing error" : "签名出错了",
		"Transaction must have at least one output" : "交易必须至少有一个输出",
		"Transaction must have at least one input" : "交易必须至少有一个输入",
		"Invalid coin name" : "无效的币种",
		"Error signing message" : "签名消息出错了"
	}
};

var translator = function(language, key) {
	if (messages[language] && messages[language][key]) {
		return messages[language][key];
	} else {
		return key;
	}
};

module.exports = translator;