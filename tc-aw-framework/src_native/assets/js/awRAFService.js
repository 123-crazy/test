// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides core angularJS services abstraction.
 * @module js/awRAFService
 */

import AwWindowService from 'js/awWindowService';
export default class AwRAFService {
    static instance() {
        const requestAnimationFrame = AwWindowService.instance.requestAnimationFrame ||
            AwWindowService.instance.webkitRequestAnimationFrame;

        const cancelAnimationFrame = AwWindowService.instance.cancelAnimationFrame ||
            AwWindowService.instance.webkitCancelAnimationFrame ||
            AwWindowService.instance.webkitCancelRequestAnimationFrame;

        const rafSupported = Boolean( requestAnimationFrame );
        let raf = rafSupported ?
            function( fn ) {
                var id = requestAnimationFrame( fn );
                return function() {
                    cancelAnimationFrame( id );
                };
            } :
            //Fallback method if RAF is not supported.
            // The delay used in setTiout is borrowed from angular codebase
            function( fn ) {
                var timer = setTimeout( fn, 16.66 ); // 1000 / 60 = 16.666
                return function() {
                    clearTimeout( timer );
                };
            };
        raf.supported = rafSupported;
        return raf;
    }
}
