module.exports = {
    INVALID_BODY: { code: 7000, message: 'Invalid request header/body fields: %s', status: 400 },

    CONN_TIMEOUT: { code: 7001, message: 'Connection timeouts', status: 408 },
    CONN_ERROR: { code: 7002, message: 'Connection error', status: 503 },

    CERT_ERROR: { code: 7003, message: 'Failed to generate certificates: %s', status: 500 },
    DOWNLOAD_CERT_ERROR: { code: 7004, message: 'Failed to download certificate files', status: 500 },
    WRITE_TIMEOUT: { code: 7005, message: 'Write file timeouts', status: 408 },
    WRITE_ERROR: { code: 7006, message: 'Failed to write file: %s', status: 500 },
    MEMORY_ERROR: { code: 7007, message: 'Failed to measure disk space', status: 500 },
    DEVICE_ERROR: { code: 7008, message: 'Failed to connect to thing: %s', status: 400 },
    DEVICE_MEMORY_ERROR: { code: 7009, message: 'Not enough disk space on your thing', status: 400 },
    DEVICE_DEPLOY_CODE_ERROR: { code: 7010, message: 'Failed to deploy code to thing: %s', status: 400 },
    DEVICE_DEPLOY_RESOURCE_ERROR: { code: 7011, message: 'Failed to deploy resourceinfo/certificates to thing: %s', status: 400 },
    FUNCTION_NOT_FOUND: { code: 7012, message: 'Uploaded code not found. Please upload again', status: 404 },
    DEVICE_EXECUTE_COMMAND_ERROR: { code: 7013, message: 'Thing fails to execute command: %s', status: 500 },
    UPDATE_CONN_INFO_ERROR: { code: 7014, message: 'Failed to update connection information', status: 500 },
    LOG_FILE_NOT_FOUND: { code: 7015, message: 'Command log not found', status: 404 },

    INITIALIZE_ERROR: { code: 905, message: 'Initailized error', status: 400 }
};
