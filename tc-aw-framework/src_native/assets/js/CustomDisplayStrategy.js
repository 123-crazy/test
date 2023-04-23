// Copyright (c) 2019 Siemens

/* global
 define
 */
import DF from '@diagramming/foundation';
/**
 * This module define a customized grouping display strategy
 *
 * @module js/CustomDisplayStrategy
 */

var GroupingDisplayStrategy = DF.Models.GroupingDisplayStrategy;

/**
 * This class presents the customized nested node display strategy.
 *
 * @constructor
 */
function CustomDisplayStrategy() {
    GroupingDisplayStrategy.call( this );
}

/**
 * Hide a node. Application can assign hidden child objects when the node is hidden. By default, only the label and
 * ports of this node will hide, its child nodes are still shown.
 */
CustomDisplayStrategy.prototype.hide = function() {
    GroupingDisplayStrategy.prototype.hide.call( this );
};

/**
 * Show a node. Application can assign hidden child objects even if the node is shown. By default, all the child
 * objects will show.
 */
CustomDisplayStrategy.prototype.show = function() {
    GroupingDisplayStrategy.prototype.show.call( this );
};
GroupingDisplayStrategy.inheritedBy( CustomDisplayStrategy );

export default CustomDisplayStrategy;
