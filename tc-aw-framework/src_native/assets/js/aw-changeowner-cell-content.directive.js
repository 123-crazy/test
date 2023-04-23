// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support change owner panel list cell content implementation.
 * 
 * @module js/aw-changeowner-cell-content.directive
 */
import * as app from 'app';
import 'js/aw-i18n.directive';
import 'soa/kernel/clientDataModel';

/**
 * Directive for change owner panel list cell content implementation.
 * 
 * @example <aw-changeowner-cell-content vmo="vmo"> </aw-changeowner-cell-content>
 * 
 * @member aw-changeowner-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awChangeownerCellContent', [ 'soa_kernel_clientDataModel', function( cdm ) {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        link: function( $scope ) {
            if( $scope.vmo && $scope.vmo.props && $scope.vmo.props.user ) {
                if( $scope.vmo.props.user.dbValues ) {
                    var userModelObject = cdm.getObject( $scope.vmo.props.user.dbValues[ 0 ] );
                }
                if( userModelObject && userModelObject.props && userModelObject.props.person ) {
                    if( userModelObject.props.person.dbValues ) {
                        var personModelObject = cdm.getObject( userModelObject.props.person.dbValues[ 0 ] );
                    }
                    if( personModelObject && personModelObject.props ) {
                        if( personModelObject.props.user_name ) {
                            $scope.username = personModelObject.props.user_name.uiValues[ 0 ];
                        }
                        if( personModelObject.props.PA9 ) {
                            $scope.emailaddress = personModelObject.props.PA9.uiValues[ 0 ];
                        }
                        if( personModelObject.props.PA10 ) {
                            $scope.phonenumber = personModelObject.props.PA10.uiValues[ 0 ];
                        }
                    }
                }
            }
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-changeowner-cell-content.directive.html'
    };
} ] );
