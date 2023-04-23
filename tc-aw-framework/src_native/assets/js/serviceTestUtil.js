// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides the utility functions to clean up the instances of core angularJS services.
 *
 * @module js/serviceTestUtil
 */
import AwHttpService from 'js/awHttpService';
import AwTimeoutService from 'js/awTimeoutService';
import AwRootScopeService from 'js/awRootScopeService';
import AwInjectorService from 'js/awInjectorService';
import AwAnimateService from 'js/awAnimateService';
import AwBaseService from 'js/awBaseService';
import AwCacheFactoryService from 'js/awCacheFactoryService';
import AwCompileService from 'js/awCompileService';
import AwElementService from 'js/awElementService';
import AwFilterService from 'js/awFilterService';
import AwInterpolateService from 'js/awInterpolateService';
import AwLocaleService from 'js/awLocaleService';
import AwLocationService from 'js/awLocationService';
import AwSceService from 'js/awSceService';
import AwStateService from 'js/awStateService';
import AwTemplateCacheService from 'js/awTemplateCacheService';
import AwHttpBackendService from 'js/awHttpBackendService';
import AwControllerService from 'js/awControllerService';

import appCtxService from 'js/appCtxService';

// AFX Service
// Note - Only add wide impact service to here
import LocationNavigationService from 'js/locationNavigation.service';

/**
 * For unit test we have to clean it up the ng services instances becuase it is no more singleton once
 * angularJS is restarted
 */
export let setupServices = function() {
    // OOTB angularJS Service
    AwHttpService.reset();
    AwTimeoutService.reset();
    AwRootScopeService.reset();
    AwInjectorService.reset();
    AwAnimateService.reset();
    AwBaseService.reset();
    AwCacheFactoryService.reset();
    AwCompileService.reset();
    AwElementService.reset();
    AwFilterService.reset();
    AwInterpolateService.reset();
    AwLocaleService.reset();
    AwLocationService.reset();
    AwSceService.reset();
    AwStateService.reset();
    AwTemplateCacheService.reset();
    AwHttpBackendService.reset();
    AwControllerService.reset();

    // AFX common service
    LocationNavigationService.reset();

    // Most of the apollo/afx service is assuming this service shuould be
    // initialized - we set it up globally
    LocationNavigationService.instance;

    // Initialize the appCtxService with state information.
    appCtxService.loadConfiguration();
};
export default { setupServices };
