package com.bdx.obelisk.exception;

public class ObeliskException extends RuntimeException {

	private static final long serialVersionUID = -8684190846535591916L;
	
	private int errorCode;
	
	public ObeliskException(int errorCode){
		super(toMessage(errorCode));
		this.errorCode = errorCode;
	}

	public int getErrorCode() {
		return errorCode;
	}
	
	protected static String toMessage(int errorCode){
		String message = null;
		switch(errorCode)
		{
		case 1:
			message = "service_stopped";
			break;
		case 2:
			message = "operation_failed";
			break;
		// blockchain errors
		case 3:
			message = "not_found";
			break;
		case 4:
			message = "duplicate";
			break;
		case 5:
			message = "unspent_output";
			break;
		case 6:
			message = "unsupported_payment_type";
			break;
		// network errors
		case 7:
			message = "resolve_failed";
			break;
		case 8:
			message = "network_unreachable";
			break;
		case 9:
			message = "address_in_use";
			break;
		case 10:
			message = "listen_failed";
			break;
		case 11:
			message = "accept_failed";
			break;
		case 12:
			message = "bad_stream";
			break;
		case 13:
			message = "channel_timeout";
			break;
		// transaction pool
		case 14:
			message = "blockchain_reorganized";
			break;
		case 15:
			message = "pool_filled";
			break;
		// validate tx
		case 16:
			message = "coinbase_transaction";
			break;
		case 17:
			message = "is_not_standard";
			break;
		case 18:
			message = "double_spend";
			break;
		case 19:
			message = "input_not_found";
			break;
		// check_transaction()
		case 20:
			message = "empty_transaction";
			break;
		case 21:
			message = "output_value_overflow";
			break;
		case 22:
			message = "invalid_coinbase_script_size";
			break;
		case 23:
			message = "previous_output_null";
			break;	
		// validate block
		case 24:
			message = "previous_block_invalid";
			break;	
		// check_block()
		case 25:
			message = "size_limits";
			break;	
		case 26:
			message = "proof_of_work";
			break;	
		case 27:
			message = "futuristic_timestamp";
			break;	
		case 28:
			message = "first_not_coinbase";
			break;	
		case 29:
			message = "extra_coinbases";
			break;	
		case 30:
			message = "too_many_sigs";
			break;	
		case 31:
			message = "merkle_mismatch";
			break;	
		// accept_block()
		case 32:
			message = "incorrect_proof_of_work";
			break;	
		case 33:
			message = "timestamp_too_early";
			break;	
		case 34:
			message = "non_final_transaction";
			break;	
		case 35:
			message = "checkpoints_failed";
			break;	
		case 36:
			message = "old_version_block";
			break;	
		case 37:
			message = "coinbase_height_mismatch";
			break;	
		// connect_block()
		case 38:
			message = "duplicate_or_spent";
			break;	
		case 39:
			message = "validate_inputs_failed";
			break;	
		case 40:
			message = "fees_out_of_range";
			break;	
		case 41:
			message = "coinbase_too_large";
			break;	
		}
		return message;
	}
}
