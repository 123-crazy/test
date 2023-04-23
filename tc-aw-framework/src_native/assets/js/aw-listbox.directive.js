// Copyright (c) 2020 Siemens

/**
 * Directive to display listbox.
 *
 * @module js/aw-listbox.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-widget.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';

/**
 * Directive to display listbox.
 *
 * @example <aw-listbox></aw-listbox>
 *
 * @member aw-list-box
 * @memberof NgElementDirectives
 */
app.directive( 'awListbox', [
    '$q',
    'viewModelService',
    'uwPropertyService',
    function( $q, viewModelSvc, uwPropertyService ) {
        return {
            restrict: 'E',
            scope: {
                prop: '=',
                list: '=',
                action: '@',
                isSelectOnly: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-listbox.directive.html',
            controller: [
                '$scope',
                function( $scope ) {
                    if( $scope.prop !== undefined ) {
                        $scope.prop.emptyLOVEntry = false;
                        $scope.prop.lovApi = {};
                        $scope.prop.lovApi.type = 'static';
                        $scope.previousSelectedLov = null;

                        $scope.prop.lovApi.getInitialValues = function( filterStr, deferred, name ) { // eslint-disable-line no-unused-vars
                            if( !$scope.list ) {
                                $scope.list = [];
                            }
                            deferred.resolve( $scope.list );
                        };

                        $scope.prop.lovApi.getNextValues = function( promise ) {
                            // no-op
                            promise.resolve( null );
                        };

                        $scope.prop.lovApi.validateLOVValueSelections = function( value ) { // eslint-disable-line no-unused-vars
                            // Either return a promise or don't return anything. In this case, we don't want to return anything
                        };

                        /**
                         * Return lovEntry for the provided filter text if found else return null.
                         *
                         * @param {ObjectArray} lovEntries -
                         * @param {String} filterText -
                         *
                         * @return {Object} lovEntry
                         */
                        $scope.prop.lovApi.retrieveLovEntry = function( lovEntries, filterText ) {
                            var lovEntry = null;
                            for( var i = 0; i < lovEntries.length; i++ ) {
                                if( lovEntries[ i ].propInternalValue === filterText ) {
                                    lovEntry = lovEntries[ i ];
                                    break;
                                }
                            }
                            return lovEntry;
                        };

                        /**
                         * Return true if the provided filter text is a valid and is one of the entry in the list.
                         *
                         * @param {ObjectArray} lovEntries -
                         * @param {String} filterText -
                         *
                         * @return {boolean} true if the provided filter text is a valid and is one of the entry in
                         *         the list.
                         */
                        $scope.prop.lovApi.isValidEntry = function( lovEntries, filterText ) {
                            var lovEntry = $scope.prop.lovApi.retrieveLovEntry( lovEntries, filterText );
                            return lovEntry !== null && lovEntry !== undefined;
                        };

                        /**
                         * Update list box value.
                         *
                         * @param {Array} lovEntries
                         * @param {String} value
                         */
                        $scope.prop.lovApi.updateValue = function( lovEntries, value ) {
                            updatePreviousValue( lovEntries, value );
                            if( $scope.prop.isArray ) {
                                $scope.prop.dbValue.push( $scope.previousSelectedLov.propInternalValue );
                            } else {
                                $scope.prop.dbValue = $scope.previousSelectedLov.propInternalValue;
                            }
                            $scope.prop.uiValue = $scope.previousSelectedLov.propDisplayValue;
                            if( $scope.prop.dbOriginalValue && $scope.prop.uiOriginalValue ) {
                                // update original values
                                $scope.prop.dbOriginalValue = $scope.prop.dbValue;
                                $scope.prop.uiOriginalValue = $scope.prop.uiValue;
                            }
                        };

                        /**
                         * This function is called in debounced way to revert back to original value
                         */
                        var revertBackToPrevious = function() {
                            var mLovEntries = $scope.list;
                            if( !$scope.prop.isArray &&
                                $scope.prop.lovApi.isValidEntry &&
                                !$scope.prop.lovApi.isValidEntry( mLovEntries, $scope.prop.dbValue ) &&
                                $scope.previousSelectedLov ) {
                                $scope.prop.uiValue = $scope.previousSelectedLov.propDisplayValue;
                                uwPropertyService.setValue( $scope.prop,
                                    $scope.previousSelectedLov.propInternalValue, true );
                                uwPropertyService.triggerDigestCycle();
                            }
                            debouncedRevertBack.cancel();
                        };
                        var debouncedRevertBack = _.debounce( revertBackToPrevious, 300 );

                        $scope.prop.propApi.notifyPropChange = function() {
                            var mLovEntries = $scope.list;
                            updatePreviousValue( mLovEntries, $scope.prop.dbValue );
                            debouncedRevertBack();
                        };

                        /**
                         * This function is used to preserve previous selected value
                         * @param {*} lovEntries lov entries provided in the listbox
                         * @param {*} value current value in LOV widget
                         */
                        var updatePreviousValue = function( lovEntries, value ) {
                            var lovValue = $scope.prop.lovApi.retrieveLovEntry( lovEntries, value );
                            if( !lovValue ) {
                                if( $scope.previousSelectedLov ) {
                                    lovValue = $scope.previousSelectedLov;
                                } else {
                                    lovValue = lovEntries[ 0 ];
                                }
                            }
                            $scope.previousSelectedLov = lovValue;
                        };
                    }
                }
            ],
            link: function( $scope ) {
                var mLovEntries = [];
                $scope.$watch( 'list', function _watchList() {
                    if( $scope.prop && $scope.prop.lovApi ) {
                        var defered = $q.defer();
                        defered.promise.then( function( lovEntries ) {
                            $scope.previousSelectedLov = null;
                            mLovEntries = lovEntries;
                            if( lovEntries.length > 0 && $scope.prop ) {
                                if( $scope.prop.dbValue ) {
                                    $scope.prop.lovApi.updateValue( lovEntries, $scope.prop.dbValue );
                                } else {
                                    $scope.prop.lovApi.updateValue( lovEntries, lovEntries[ 0 ].propInternalValue );
                                }
                                var eventData = lovEntries;
                                $scope.$broadcast( 'lovEntries.update', eventData );
                            }
                        } );
                        $scope.prop.lovApi.getInitialValues( '', defered );
                    }
                } );
                // watcher of value change
                if( $scope.action ) {
                    $scope.$watchCollection( 'prop.dbValue', function _watchPropDbValue( newValue ) {
                        if( newValue !== null && newValue !== undefined && $scope.prop ) {
                            var filterText = $scope.prop.isArray ? newValue[ newValue.length - 1 ] : newValue;
                            if( $scope.prop.lovApi.isValidEntry && $scope.prop.lovApi.isValidEntry( mLovEntries, filterText ) ) {
                                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                                viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                            }
                        }
                    } );
                }

                $scope.prop.isSelectOnly = $scope.prop && $scope.isSelectOnly === 'true';
            }
        };
    }
] );
