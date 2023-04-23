// Copyright (c) 2020 Siemens

/**
 * Directive to display ordered steps.
 *
 * @module js/aw-step-progress.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import wcagSvc from 'js/wcagService';
import 'angular';
import 'js/aw-widget.directive';
import 'js/exist-when.directive';
import 'js/aw-property.directive';
import 'js/viewModelService';
import 'js/aw-repeat.directive';

/**
 * Directive to display ordered steps.
 * @returns {Object} return
 */
app.directive( 'awStepProgress', [
    function() {
        return {
            restrict: 'E',
            scope: {
                clickable: '=?',
                steps: '=',
                currentStep: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-step-progress.directive.html',
            link: function( $scope, attrs ) {
                var _stepCompletedDef;

                // need to set activeStepNumber at initialization of widget
                $scope.activeStepNumber = 1;

                /**
                 * Method to set aria-value attriutes
                 */
                function setAriaValueAttributes() {
                    let stepNo = $scope.steps.findIndex( step => {
                        return step.isCurrentActive;
                    } );
                    $scope.activeStepNumber = stepNo + 1;
                }

                /**
                 * Function to mark a step as completed
                 * @param {Object} aStep step
                 */
                function markCompleted( aStep ) {
                    aStep.isCompleted = true;
                    aStep.isCurrentActive = false;
                    aStep.isInProgress = false;
                }

                /**
                 * Function to mark a step in progress
                 * @param {Object} aStep step
                 */
                function markInProgressStep( aStep ) {
                    aStep.isCompleted = false;
                    aStep.isCurrentActive = true;
                    aStep.isInProgress = true;
                }

                /**
                 * Function to mark a step as current active
                 * @param {Object} aStep step
                 */
                function markCurrentActiveStep( aStep ) {
                    aStep.isCurrentActive = true;
                }

                /**
                 * Function to reset a current active step
                 * @param {Object} aStep step
                 */
                function resetCurrentActiveStep( aStep ) {
                    aStep.isCurrentActive = false;
                }

                /**
                 * Function to check equality of two steps
                 * @param {Object} aStep step
                 * @param {Object} bStep step
                 * @returns {Object} boolean
                 */
                function isEqual( aStep, bStep ) {
                    if( aStep.dbValue && bStep.dbValue && aStep.dbValue === bStep.dbValue ) {
                        return true;
                    }
                    if( aStep.uiValue && bStep.uiValue && aStep.uiValue === bStep.uiValue ) {
                        return true;
                    }
                    return false;
                }
                _stepCompletedDef = eventBus.subscribe( attrs[ 0 ].id + '.stepCompleted', function( eventData ) {
                    if( eventData ) {
                        if( eventData.completedStep ) {
                            var completedStep = _.find( $scope.steps, function( aStep ) {
                                if( isEqual( aStep, eventData.completedStep ) ) {
                                    return true;
                                }
                            } );
                            if( completedStep ) {
                                markCompleted( completedStep );
                            }
                        }
                        if( eventData.currentStep ) {
                            var currentStep = _.find( $scope.steps, function( aStep ) {
                                if( isEqual( aStep, eventData.currentStep ) ) {
                                    return true;
                                }
                            } );
                            if( currentStep ) {
                                markInProgressStep( currentStep );
                                $scope.currentStep = currentStep;
                            }
                        }
                        setAriaValueAttributes();
                    }
                } );
                if( $scope.clickable ) {
                    $scope.doIt = function( $event, selectedStep ) {
                        resetCurrentActiveStep( $scope.currentStep );
                        markCurrentActiveStep( selectedStep );
                        $scope.currentStep = selectedStep;
                        setAriaValueAttributes();
                        eventBus.publish( attrs[ 0 ].id + '.stepSelectionChanged', {
                            selectedStep: selectedStep
                        } );
                    };

                    $scope.moveToStep = function( event, progBarEntry ) {
                        if( wcagSvc.isValidKeyPress( event ) ) {
                            $scope.doIt( event, progBarEntry );
                        }
                    };
                }

                $scope.$on( '$destroy', function() {
                    if( _stepCompletedDef ) {
                        eventBus.unsubscribe( _stepCompletedDef );
                        _stepCompletedDef = null;
                    }
                } );
            }
        };
    }
] );
