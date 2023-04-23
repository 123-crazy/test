// Copyright (c) 2020 Siemens

/**
 * Display the icon associated with a given 'ViewModelObject' that represents a Type.
 *
 * @module js/aw-type-icon.directive
 */
import app from 'app';
import 'soa/kernel/clientMetaModel';
import 'js/awIconService';

/**
 * Display the icon associated with a given 'ViewModelObject' that represents a Type.
 *
 * @example <aw-type-icon vmo="[ViewModelObject]"></aw-type-icon>
 *
 * @memberof NgDirectives
 * @member aw-type-icon
 */
app.directive( 'awTypeIcon', [
    'awIconService', 'soa_kernel_clientMetaModel',
    function( awIconSvc, cmm ) {
        return {
            restrct: 'E',
            scope: {
                vmo: '='
            },
            controller: [ '$scope', function( $scope ) {
                $scope.$watch( 'vmo', function() {
                    var typeHierarchy = [];
                    if( $scope.vmo ) {
                        var type = cmm.getType( $scope.vmo.uid );
                        if( type ) {
                            typeHierarchy = type.typeHierarchyArray;
                        } else {
                            typeHierarchy.push( $scope.vmo.props.type_name.dbValue );
                            var parentTypes = $scope.vmo.props.parent_types.dbValues;
                            for( var j in parentTypes ) {
                                // parentType is of form "TYPE::Item::Item::WorkspaceObject"
                                var arr = parentTypes[ j ].split( '::' );
                                typeHierarchy.push( arr[ 1 ] );
                            }
                        }
                    }

                    $scope.typeIcon = awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );
                } );
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-type-icon.directive.html'
        };
    }
] );
