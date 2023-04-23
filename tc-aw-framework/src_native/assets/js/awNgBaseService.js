// Copyright (c) 2020 Siemens

/**
 * This represents the Base class for NgService Wrapper
 *
 * @module js/awNgBaseService
 */
import app from 'app';
import AwBaseService from 'js/awBaseService';
import logger from 'js/logger';

export default class AwNgBaseService extends AwBaseService {
    constructor() {
        super();

        // we can add whatever logic we want, like null check here
        let dep = AwNgBaseService.getService( this.constructor.serviceName );
        if( !dep ) {
            // Below error make sure when people is abusing function/class which has AngularJS dependency, we can clearly print error below:
            // Error: Fail to initialize AwPromiseService - AngularJS injector is not available or $q is not injected.
            //     at AwPromiseService.NgBaseService (out/karma/assets/js/ngBaseService.js:46:15)
            //     at new AwPromiseService (out/karma/assets/js/awPromiseService.js:34:81)
            //
            //    at Function.get (out/karma/assets/js/baseService.js:32:31)
            //     at Object.getCfg (out/karma/kernel/assets/js/configurationService.js:1663:69)
            //     at Object.<anonymous> (out/karma/assets/js/appCtxService.js:149:33)              <-- abuse function with angular dependency at top level of module
            //     at Object.execCb (node_modules/requirejs/require.js:1665:33)
            //     at Module.check (node_modules/requirejs/require.js:874:51)
            //     at Module.enable (node_modules/requirejs/require.js:1158:22)
            //     at Module.init (node_modules/requirejs/require.js:782:26)
            //     at callGetModule (node_modules/requirejs/require.js:1185:63)"
            const err = new Error( `Fail to initialize ${this.constructor.name} - AngularJS injector is not available or ${this.constructor.serviceName} is not injected.` );
            logger.error( err.stack );
            throw err;
        }

        return dep;
    }

    /**
     * get AngularJS Service
     * By this practice we can have better mock later in setupNgInjector
     * @param {string} name NG service name
     * @returns {object} NG service object
     */
    static getService( name ) {
        return app.getInjector().get( name );
    }
}
