// Copyright (c) 2020 Siemens

/**
 * @module js/aw-chip.directive
 */
import * as app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import buttonStyles from 'js/buttonStyles';
import 'js/aw-icon.directive';
import 'js/enable-when.directive';

const ChipTypes = {
    STATIC: 'STATIC',
    BUTTON: 'BUTTON',
    SELECTION: 'SELECTION'
};

const DEFAULT_CHIP_STYLE = 'base';

// the map from unselected button type to selected button type
const SelectionChipStyleMap = {
    base: 'accent-mid-contrast',
    accent: 'accent-high-contrast',
    caution: 'accent-caution',
    positive: 'accent-positive',
    negative: 'accent-negative'
};

/**
 * Definition for the 'aw-chip' directive used to indicate the current selection
 * chip: the view model object for chip.
 * buttonType: optional. The chip button style, default to 'base' type.
 * action: optional. The declarative action to perform when chip is clicked.
 * ui-icon-action: optional. The declarative action to perform when UI icon is clicked. It only applicable for BUTTON chip type.
 *
 * @example <aw-chip chip='data.staticChip'>
 * @example <aw-chip chip='data.staticChip' button-type='accent-high-contrast'>
 * @example <aw-chip chip='data.selectionChip' action='toggleAction'>
 * @example <aw-chip chip='data.selectionChip' action='toggleAction' ui-icon-action='removeChipAction'>
 *
 * @member aw-chip
 * @memberof NgAttributeDirectives
 */
app.directive( 'awChip', //
    function() {
        return {
            restrict: 'E',
            scope: {
                chip: '=', //single chip object
                buttonType: '@?',
                action: '@?',
                uiIconAction: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-chip.directive.html',
            controller: [ '$scope', 'viewModelService',
                function( $scope, viewModelSvc ) {
                    if( !$scope.chip ) {
                        logger.error( 'Chip model object is undefined, failed to render aw-chip.' );
                        return;
                    }
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    viewModelSvc.bindConditionStates( declViewModel, $scope );
                    $scope.conditions = declViewModel.getConditionStates();

                    $scope.showLabel = true;
                    if( $scope.chip.showLabel !== undefined ) {
                        $scope.showLabel = Boolean( $scope.chip.showLabel );
                    }

                    $scope.showIcon = true;
                    if( $scope.chip.showIcon !== undefined ) {
                        $scope.showIcon = Boolean( $scope.chip.showIcon );

                        //always make label visible when both icon and label are configured hidden.
                        if( !$scope.showIcon && !$scope.showLabel ) {
                            $scope.showLabel = true;
                        }
                    }

                    var chipType = $scope.chip.chipType;
                    if( chipType ) {
                        if( ChipTypes.hasOwnProperty( chipType ) ) {
                            $scope.chipType = chipType;
                        } else {
                            logger.warn( 'Chip type "' + chipType + '" is invalid.' );
                        }
                    }

                    if( !$scope.chipType ) {
                        $scope.chipType = $scope.action ? ChipTypes.BUTTON : ChipTypes.STATIC;
                    }

                    // only selection chip type support 'selected' property
                    if( $scope.chipType !== ChipTypes.SELECTION ) {
                        delete $scope.chip.selected;
                    }

                    // the button type defined in chip data model will take precedence than the 'buttonType' scope data
                    if( $scope.chip.buttonType ) {
                        $scope.buttonType = $scope.chip.buttonType;
                    }

                    if( !$scope.buttonType ) {
                        $scope.buttonType = DEFAULT_CHIP_STYLE;
                    }

                    $scope.uiIconClicked = function( event ) {
                        event.stopPropagation();

                        // perform action when UI icon get clicked
                        if( $scope.uiIconAction ) {
                            performAction( $scope.uiIconAction );
                        }
                    };

                    $scope.handleChipClick = function() {
                        // perform action for non static chip
                        if( $scope.chipType !== 'STATIC' ) {
                            performAction( $scope.action );
                        }
                    };

                    var performAction = function( action ) {
                        if( action ) {
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, action, $scope );
                        }
                    };
                }
            ],
            link: function( $scope, $element ) {
                $scope.buttonTypeRegulated = false;

                /** Regulate button type for selection chip.
                 * If the initial button type start with 'accent', then convert to it's corresponding unselected button type
                 */
                function regulateToUnSelectedButtonType() {
                    if( $scope.chip.buttonType ) {
                        $scope.buttonType = $scope.chip.buttonType;
                    }

                    if( !$scope.buttonType ) {
                        $scope.buttonType = DEFAULT_CHIP_STYLE;
                    }

                    var unselectedButtonType = _.findKey( SelectionChipStyleMap, function( type ) {
                        return $scope.buttonType === type;
                    } );

                    if( unselectedButtonType ) {
                        $scope.buttonType = unselectedButtonType;
                    }
                }

                /**
                 * Set chip button style by given button type
                 * @param {String} buttonType the chip button type
                 */
                function setChipButtonStyle( buttonType ) {
                    if( $scope.chipButtonStyle ) {
                        $element.removeClass( $scope.chipButtonStyle );
                    }
                    $scope.chipButtonStyle = buttonStyles.getButtonStyle( buttonType, DEFAULT_CHIP_STYLE );
                    $element.addClass( $scope.chipButtonStyle );
                }

                // switch button type and update selection chip style when selection changed
                if( $scope.chipType === 'SELECTION' ) {
                    $scope.$watch( 'chip.selected', function( newVal ) {
                        if( newVal === undefined ) {
                            return;
                        }

                        if( !$scope.buttonTypeRegulated ) {
                            regulateToUnSelectedButtonType();
                            $scope.buttonTypeRegulated = true;
                        }

                        // get selected button type
                        var buttonType = $scope.buttonType;
                        if( newVal ) {
                            buttonType = SelectionChipStyleMap[ $scope.buttonType ];
                        }

                        setChipButtonStyle( buttonType );
                    } );
                }

                // set chip style for non-selection chip
                setChipButtonStyle( $scope.buttonType );
            },
            replace: true
        };
    } );
