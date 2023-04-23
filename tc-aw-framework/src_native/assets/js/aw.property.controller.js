// Copyright (c) 2020 Siemens

/**
 * @module js/aw.property.controller
 */
import app from 'app';
import 'js/localeService';

/**
 * Defines the primary ViewModelProperty based directive controller.
 *
 * @member awPropertyController
 * @memberof NgControllers
 */
app.controller( 'awPropertyController', [
    '$scope', '$timeout', '$element', 'localeService',
    function( $scope, $timeout, $element, localeSvc ) {
        var self = this;

        /**
         * @function setData
         *
         * @param {ViewModelProperty} vmProp - The ViewModelProperty to set as the data basis for the 'directive' using
         *            this controller.
         */
        self.setData = function( vmProp ) {
            $scope.$evalAsync( function() {
                /**
                 * Set the given data object as the primary property object.
                 */
                $scope.prop = vmProp;

                if( $scope.prop.type === 'BOOLEAN' || $scope.prop.type === 'BOOLEANARRAY' ) {
                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        $scope.prop.propertyRadioTrueText = localTextBundle.RADIO_TRUE;
                        $scope.prop.propertyRadioFalseText = localTextBundle.RADIO_FALSE;

                        /**
                         * Handles setting of custom labels and vertical alignment attributes when directives are used
                         * natively
                         */
                        if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.customTrueLabel ) {
                            $scope.prop.propertyRadioTrueText = $scope.prop.radioBtnApi.customTrueLabel;
                        }

                        if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.customFalseLabel ) {
                            $scope.prop.propertyRadioFalseText = $scope.prop.radioBtnApi.customFalseLabel;
                        }

                        if( $scope.prop.radioBtnApi && $scope.prop.radioBtnApi.vertical ) {
                            $scope.prop.vertical = $scope.prop.radioBtnApi.vertical;
                        }
                    } );
                }

                if( $scope.prop.type === 'STRING' || $scope.prop.type === 'STRINGARRAY' ) {
                    $scope.prop.inputType = 'text';
                }
            } ); // evalAsync

            // scope initialization time.  Fire the creation notification scope event.
            $scope.$emit( 'AWUnvWCreated', $element );
        }; // setData

        $scope.$on( '$destroy', function() {
            // Destroying all watch listeners
            if( $scope.parseUrlListener ) {
                $scope.parseUrlListener();
            }

            if( $scope.widgetInitializeListener ) {
                $scope.widgetInitializeListener();
            }

            if( $scope.typeChangeListener ) {
                $scope.typeChangeListener();
            }

            if( $scope.editStateListener ) {
                $scope.editStateListener();
            }

            // Destroying all timeouts
            if( $scope.nonEditArrayTimer ) {
                $timeout.cancel( $scope.nonEditArrayTimer );
            }

            if( $scope.editArrayTimer ) {
                $timeout.cancel( $scope.editArrayTimer );
            }

            if( $element.remove ) {
                $element.remove();
            }
        } ); // $destroy
    }
] ); // awPropertyController
