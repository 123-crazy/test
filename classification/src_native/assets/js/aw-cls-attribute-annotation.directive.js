// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to display a Active Widget.
 *
 * @module js/aw-cls-attribute-annotation.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-property-label.directive';
import 'js/aw-property-val.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/uwSupportService';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/classifyService';
import 'js/aw-icon.directive';
import 'js/aw-icon-button.directive';
import 'js/classifyFullViewService';
import 'js/extended-tooltip.directive';
import 'js/aw-listbox.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-link.directive';
import 'js/aw-cls-list.directive';
import 'js/aw-class.directive';

/**
 * Directive to display a Active Widget.
 *
 * @example <aw-cls-attribute-annotation prop="prop"></aw-cls-attribute-annotation>
 *
 * @member aw-cls-attribute-annotation
 * @memberof NgElementDirectives
 */
app.directive( 'awClsAttributeAnnotation', //
    [ 'viewModelService', 'uwPropertyService', 'uwSupportService', 'classifyService', 'classifyFullViewService', 'appCtxService',//
        function( viewModelSvc, uwPropertyService, uwSupportSvc, classifySvc, classifyFullViewSvc, appCtxSvc ) {
            return {
                restrict: 'E',
                scope: {
                    prop: '=',
                    modifiable: '=?',
                    hint: '@?',
                    labeldisplay: '@?',
                    parentattribute: '=?',
                    cardinalattribute: '=?',
                    childlevel: '=?',
                    instance: '='
                },
                controller: [ '$scope', function( $scope ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    //align nested props
                    // $scope.propalign = $scope.childlevel * 20 + 'px';
                    $scope.propalign = 10 + 'px';
                    //align annotation for nested props. Issue in create mode with overlap. So skipping it for now.
                    $scope.tmpalign = $scope.childlevel > 0 ? $scope.childlevel < 4 ? $scope.childlevel * 20 : 40 : 0;
                    $scope.annoalign = '-' + $scope.tmpalign + 'px';
                    if ( $scope.cardinalattribute || $scope.instance ) {
                        $scope.childlevel++;
                    }

                    if( $scope.prop ) {
                        if( $scope.modifiable !== undefined ) {
                            uwPropertyService.setIsPropertyModifiable( $scope.prop, $scope.modifiable );
                        }

                    //If a checkbox and required, set the placeholder text to null
                    if( $scope.prop ) {
                        if( $scope.prop[0].type === 'BOOLEAN' &&  $scope.prop[0].isRequired === true ) {
                            uwPropertyService.setPlaceHolderText( $scope.prop, null );
                            $scope.prop[0].propertyRequiredText = '';
                        }
                    }

                        if( $scope.labeldisplay ) {
                            var propertyLabelDisplay = uwSupportSvc.retrievePropertyLabelDisplay( $scope.labeldisplay );
                            uwPropertyService.setPropertyLabelDisplay( $scope.prop, propertyLabelDisplay );
                        }
                    }

                    $scope.getAttrWidth = function() {
                        var mode = declViewModel.panelMode;
                        var adjust = $scope.prop[ 0 ].type !== 'BOOLEAN' ||  $scope.prop[ 0 ].type === 'BOOLEAN' && mode === -1;
                        if ( adjust ) {
                            // var tmp = $scope.childlevel  * 10 + $scope.childlevel + 'px';
                            var tmp = $scope.childlevel  * 10 + 'px';
                            $scope.tmpWidth = 'calc(50% - ' + tmp + ')';
                         } else {
                            $scope.tmpWidth = 0 + 'px';
                         }
                        return $scope.tmpWidth;
                    };

                    $scope.getAttrValueWidth = function() {
                        var mode = declViewModel.panelMode;
                        var adjust = $scope.prop[ 0 ].type !== 'BOOLEAN' || $scope.prop[ 0 ].type === 'BOOLEAN' && mode === -1;
                        var tmpFrom = ( mode === -1 ? 15 : mode === 0 ? 30 : 40 ) + '%';
                        if ( adjust ) {
                            var tmp = $scope.childlevel  * 10 + 'px';
                            $scope.tmpWidth = 'calc(' + tmpFrom + ' + ' +  tmp + ')';
                        } else {
                            $scope.tmpWidth = '45%';
                         }
                        return $scope.tmpWidth;
                    };

                    // Generates a number of cardinal blocks equal to the cardinalcontrollers value
                    $scope.generateCardinalBlocks = function() {
                        var cardinalValue = $scope.prop[ 0 ].dbValue;
                        classifySvc.getCardinalInstances( cardinalValue, $scope.cardinalattribute );
                        classifyFullViewSvc.updateCardinalBlocks( declViewModel, $scope.cardinalattribute );
                        // Repopulate the Property Group Tree
                        viewModelSvc.executeCommand( declViewModel, 'repopulatePropertyGroupTree', $scope );
                    };

                    $scope.selectNode = function( node ){
                        var vmoProp = $scope.prop[0].attributeInfo;
                        appCtxSvc.ctx.attributeProperties = [];

                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        var attrArr = declViewModel.attr_anno;

                        $scope.deselectNodes( attrArr );
                        $scope.prop[0].selected = true;

                        var attrId = $scope.prop[0].attributeId;
                        if( attrId.substring( 0, 4 ) === 'cst0' ) {
                            attrId = attrId.substring( 4, attrId.length );
                        }
                        var vmoProp1 = uwPropertyService.createViewModelProperty( "IRDI", "IRDI", '', attrId.toString(), attrId.toString() );
                        vmoProp1.uiValue = attrId.toString();
                        appCtxSvc.ctx.attributeProperties.push(vmoProp1);
                        for ( var i = 0 ; i < classifySvc.UNCT_ATTR_PROP.length ; i++ )
                        {
                            var key = classifySvc.UNCT_ATTR_PROP[i];
                            var value = classifySvc.getPropertyValue(
                                vmoProp, key );

                            key = classifySvc.UNCT_ATTR_PROP_DISP[i];
                            var vmoProp1 = uwPropertyService.createViewModelProperty( key, key, '', value.toString(), value.toString() );
                            vmoProp1.uiValue = value.toString();
                            appCtxSvc.ctx.attributeProperties.push(vmoProp1);
                        }
                    };


                    $scope.deselectNodes = function( attrArr ){
                      
                        _.forEach( attrArr, function( group ) {
                            if( group.type === 'Block' ) {

                                if( group.children && group.children.length > 0 ) {
                                    $scope.deselectNodes( group.children );
                                    //Cardinal Block
                                } 
                                if ( group.polymorphicTypeProperty ) {
                                     group.polymorphicTypeProperty.vmos[ 0 ].selected = false ;
                                }

                            }
                            else{
                                group.vmos[0].selected = false;
                            }
                        } );

                    };

                } ],
                link: function( $scope ) {
                    if( $scope.parentattribute ) {
                        if( $scope.parentattribute.polymorphicTypeProperty ) {
                            $scope.parentattribute.polymorphicTypeProperty.vmos[ 0 ].propApi = {};
                            $scope.parentattribute.polymorphicTypeProperty.vmos[ 0 ].propApi.fireValueChangeEvent = function() {
                                var context = {
                                    owningAttribute: $scope.parentattribute,
                                    property: $scope.prop
                                };
                                eventBus.publish( 'classify.selectLOV', context );
                            };
                        }
                    }
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-cls-attribute-annotation.directive.html'
            };
        }
    ] );
