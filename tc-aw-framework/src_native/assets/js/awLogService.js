// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides core angularJS services abstraction.
 *
 * @module js/awLogService
 */
import logger from 'js/logger';

export let instance = () => {
    return {
        debug: ( message ) => logger.debug( message ),
        log: ( message ) => logger.info( message ),
        info: ( message ) => logger.info( message ),
        warn: ( message ) => logger.warn( message ),
        error: ( message ) => logger.error( message )
    };
};

export default { instance };
