// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.RedirectCtrl}
 * @module js/aw.redirect.controller
 */
import app from 'app';

/**
 * Redirect controller.
 *
 * @class RedirectCtrl
 * @memberOf NgControllers
 */
app.controller( 'RedirectCtrl', [ '$state', function RedirectController( $state ) {
    $state.go( $state.current.data.to, $state.current.data.toParams, $state.current.data.options );
} ] );
