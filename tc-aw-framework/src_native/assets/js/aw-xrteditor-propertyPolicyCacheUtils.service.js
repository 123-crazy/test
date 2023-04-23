// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-xrteditor-propertyPolicyCacheUtils.service
 */
import app from 'app';

var exports = {};

/**
 * SOA Property Policy for summary locations
 *
 * @type {Object}
 */
export let defaultProperties = {
    "types": [ {
        "name": "WorkspaceObject",
        "properties": [ {
            "name": "object_string"
        }, {
            "name": "awp0CellProperties"
        }, {
            "name": "awp0ThumbnailImageTicket"
        } ]
    }, {
        name: 'User',
        properties: [ {
            name: 'home_folder',
            "modifiers": [ {
                "name": "withProperties",
                "Value": "true"
            } ]
        } ]
    }, {
        name: 'UserSession',
        properties: [ {
            name: 'user',
            "modifiers": [ {
                "name": "withProperties",
                "Value": "true"
            } ]
        } ]
    } ]
};

/**
 * SOA Property Policy for summary locations
 *
 * @type {Object}
 */
export let summary = {
    "types": [ {
        "name": "WorkspaceObject",
        "properties": [ {
            "name": "is_modifiable"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "owning_user"
        }, {
            "name": "fnd0IsCheckoutable"
        }, {
            "name": "checked_out_user"
        }, {
            "name": "object_type"
        } ]
    }, {
        "name": "PseudoFolder",
        "properties": [ {
            "name": "is_modifiable"
        } ]
    }, {
        "name": "Awp0FullTextSavedSearch",
        "properties": [ {
            "name": "awp0search_string"
        }, {
            "name": "awp0string_filters"
        } ]
    }, {
        "name": "Item",
        "properties": [ {
            "name": "owning_user"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "revision_list"
        }, {
            "name": "checked_out"
        } ]
    }, {
        "name": "ItemRevision",
        "properties": [ {
            "name": "item_id"
        }, {
            "name": "item_revision_id"
        }, {
            "name": "last_mod_user"
        }, {
            "name": "owning_user"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "object_desc"
        }, {
            "name": "checked_out"
        } ]
    }, {
        "name": "Group",
        "properties": [ {
            "name": "object_full_name"
        } ]
    }, {
        "name": "ListOfValues",
        "properties": [ {
            "name": "lov_name"
        } ]
    }, {
        "name": "Person",
        "properties": [ {
            "name": "user_name"
        } ]
    }, {
        "name": "Query",
        "properties": [ {
            "name": "query_name"
        } ]
    }, {
        "name": "Site",
        "properties": [ {
            "name": "name"
        } ]
    }, {
        "name": "TcFile",
        "properties": [ {
            "name": "original_file_name"
        } ]
    }, {
        "name": "User",
        "properties": [ {
            "name": "user_name"
        } ]
    }, {
        "name": "Volume",
        "properties": [ {
            "name": "volume_name"
        } ]
    }, {
        "name": "MECfgLine",
        "properties": [ {
            "name": "me_cl_display_string"
        } ]
    }, {
        "name": "Note",
        "properties": [ {
            "name": "name"
        } ]
    } ]
};

/**
 * Edit SOA Property Policy Header (includes modifiers)
 *
 * @type {Object}
 */
export let summaryEdit = {
    "types": [ {
        "name": "WorkspaceObject",
        "properties": [ {
            "name": "is_modifiable"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "owning_user"
        }, {
            "name": "fnd0IsCheckoutable"
        }, {
            "name": "checked_out_user"
        } ]
    }, {
        "name": "PseudoFolder",
        "properties": [ {
            "name": "is_modifiable"
        } ]
    }, {
        "name": "Item",
        "properties": [ {
            "name": "owning_user"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "revision_list"
        }, {
            "name": "checked_out"
        } ]
    }, {
        "name": "ItemRevision",
        "modifiers": [ {
            "name": "includeIsModifiable",
            "Value": "true"
        } ],
        "properties": [ {
            "name": "item_id"
        }, {
            "name": "item_revision_id"
        }, {
            "name": "last_mod_user"
        }, {
            "name": "owning_user"
        }, {
            "name": "last_mod_date"
        }, {
            "name": "object_desc"
        }, {
            "name": "checked_out"
        }, {
            "name": "aw2_String_LOV"
        }, {
            "name": "aw2_LOV_StringExtPubrType"
        }, {
            "name": "aw2_Hierarchy_LOV"
        }, {
            "name": "aw2_States"
        }, {
            "name": "aw2_Districts"
        } ]
    }, {
        "name": "Group",
        "properties": [ {
            "name": "object_full_name"
        } ]
    }, {
        "name": "ListOfValues",
        "properties": [ {
            "name": "lov_name"
        } ]
    }, {
        "name": "Person",
        "properties": [ {
            "name": "user_name"
        } ]
    }, {
        "name": "Query",
        "properties": [ {
            "name": "query_name"
        } ]
    }, {
        "name": "Site",
        "properties": [ {
            "name": "name"
        } ]
    }, {
        "name": "TcFile",
        "properties": [ {
            "name": "original_file_name"
        } ]
    }, {
        "name": "User",
        "properties": [ {
            "name": "user_name"
        } ]
    }, {
        "name": "Volume",
        "properties": [ {
            "name": "volume_name"
        } ]
    }, {
        "name": "Note",
        "properties": [ {
            "name": "name"
        } ]
    } ]
};

/**
 * Gateway SOA Property Policy Header (includes modifiers)
 *
 * @type {Object}
 */
export let gateway = {
    "types": [ //
        {
            "name": "Awb0Element",
            "properties": [ {
                "name": "awb0Name"
            } ]
        }, {
            "name": "ImanRelation",
            "properties": [ {
                "name": "primary_object",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "secondary_object"
            } ]
        }, {
            "name": "Awp0GatewayTileRel",
            "properties": [ {
                "name": "awp0OrderNo"
            }, {
                "name": "awp0Size"
            } ]
        }, {
            "name": "Awp0Tile",
            "properties": [ {
                "name": "awp0ContentValues"
            }, {
                "name": "awp0DisplayName"
            }, {
                "name": "awp0ObjectRef",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "awp0Params"
            }, {
                "name": "awp0Style"
            }, {
                "name": "awp0TileTemplate",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            } ]
        }, {
            "name": "Awp0TileTemplate",
            "properties": [ {
                "name": "L10N_awp0ContentNames"
            }, {
                "name": "awp0Action"
            }, {
                "name": "awp0ActionType"
            }, {
                "name": "awp0ContentNames"
            }, {
                "name": "awp0Icon"
            }, {
                "name": "awp0IconSource",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "awp0Sizes"
            }, {
                "name": "awp0ThemeIndex"
            } ]
        }, {
            "name": "BOMLine",
            "properties": [ {
                "name": "bl_rev_object_name"
            } ]
        }, {
            "name": "BusinessObject",
            "properties": [ {
                "name": "awp0CellProperties"
            }, {
                "name": "awp0ThumbnailImageTicket"
            }, {
                "name": "is_modifiable"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "ChangeItemRevision",
            "properties": [ {
                "name": "cm0DerivableTypes"
            } ]
        }, {
            "name": "DesignReqRevision",
            "properties": [ {
                "name": "has_trace_link"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "EPMBRHandler",
            "properties": [ {
                "name": "handler_arguments"
            }, {
                "name": "handler_name"
            } ]
        }, {
            "name": "EPMBusinessRule",
            "properties": [ {
                "name": "rule_handlers",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            } ]
        }, {
            "name": "EPMTask",
            "properties": [ {
                "name": "child_tasks",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "comments",
                "modifiers": []
            }, {
                "name": "complete_node_location"
            }, {
                "name": "done"
            }, {
                "name": "due_date"
            }, {
                "name": "last_mod_date"
            }, {
                "name": "late_flag"
            }, {
                "name": "location"
            }, {
                "name": "parent_name"
            }, {
                "name": "parent_process",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "parent_task",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "predecessors",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "real_state"
            }, {
                "name": "resp_party"
            }, {
                "name": "root_task",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "start_node_location"
            }, {
                "name": "state_value"
            }, {
                "name": "successors",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "task_result"
            }, {
                "name": "task_state"
            }, {
                "name": "task_template",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "valid_signoffs"
            } ]
        }, {
            "name": "EPMTaskTemplate",
            "properties": [ {
                "name": "complete_node_location"
            }, {
                "name": "complete_predecessors",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "dependency_task_templates",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "location"
            }, {
                "name": "parent_predecessor"
            }, {
                "name": "parent_task_template",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "start_action_rules",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "start_node_location"
            }, {
                "name": "start_successors",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "subtask_template",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "template_name"
            } ]
        }, {
            "name": "FullText",
            "properties": [ {
                "name": "content_type"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "Group",
            "properties": [ {
                "name": "object_full_name"
            } ]
        }, {
            "name": "GroupMember",
            "properties": [ {
                "name": "object_string"
            } ]
        }, {
            "name": "ImanFile",
            "properties": [ {
                "name": "original_file_name"
            } ]
        }, {
            "name": "ImanRelation",
            "properties": [ {
                "name": "relation_type"
            } ]
        }, {
            "name": "ImanVolume",
            "properties": [ {
                "name": "volume_name"
            } ]
        }, {
            "name": "ItemRevision",
            "properties": [ {
                "name": "allowable_participant_types",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "assignable_participant_types",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "item_id"
            }, {
                "name": "item_revision_id"
            }, {
                "name": "participants",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            } ]
        }, {
            "name": "ListOfValues",
            "properties": [ {
                "name": "lov_name"
            } ]
        }, {
            "name": "MECfgLine",
            "properties": [ {
                "name": "me_cl_display_string"
            } ]
        }, {
            "name": "Note",
            "properties": [ {
                "name": "name"
            } ]
        }, {
            "name": "POM_imc",
            "properties": [ {
                "name": "name"
            } ]
        }, {
            "name": "POM_user",
            "properties": [ {
                "name": "user_name"
            } ]
        }, {
            "name": "Paragraph Revision",
            "properties": [ {
                "name": "has_trace_link"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "Participant",
            "properties": [ {
                "name": "assignee",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            } ]
        }, {
            "name": "Person",
            "properties": [ {
                "name": "user_name"
            } ]
        }, {
            "name": "PhysicalPart",
            "properties": [ {
                "name": "isLot"
            }, {
                "name": "isSerialized"
            } ]
        }, {
            "name": "PhysicalPartRevision",
            "properties": [ {
                "name": "isAsBuiltRevision"
            }, {
                "name": "items_tag"
            }, {
                "name": "lotTag"
            }, {
                "name": "manufacturerOrgId"
            }, {
                "name": "serialNumber"
            } ]
        }, {
            "name": "Query",
            "properties": [ {
                "name": "query_name"
            } ]
        }, {
            "name": "ReleaseStatus",
            "properties": [ {
                "name": "object_string"
            } ]
        }, {
            "name": "Requirement Revision",
            "properties": [ {
                "name": "has_trace_link"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "RequirementSpec Revision",
            "properties": [ {
                "name": "has_trace_link"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "Role",
            "properties": [ {
                "name": "role_name"
            } ]
        }, {
            "name": "Sam1AsMaintainedElement",
            "properties": [ {
                "name": "object_string"
            }, {
                "name": "smr1IsLot"
            }, {
                "name": "smr1IsSerialized"
            }, {
                "name": "smr1LotTag"
            }, {
                "name": "smr1PartUsed"
            } ]
        }, {
            "name": "Signoff",
            "properties": [ {
                "name": "comments",
                "modifiers": []
            }, {
                "name": "decision"
            }, {
                "name": "decision_date"
            }, {
                "name": "group_member",
                "modifiers": []
            }, {
                "name": "object_name",
                "count": 0
            }, {
                "name": "origin",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "origin_profile",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "resource_pool",
                "modifiers": []
            } ]
        }, {
            "name": "ValidationReqRevision",
            "properties": [ {
                "name": "has_trace_link"
            }, {
                "name": "object_string"
            } ]
        }, {
            "name": "WorkspaceObject",
            "properties": [ {
                "name": "IMAN_Rendering"
            }, {
                "name": "IMAN_specification"
            }, {
                "name": "checked_out_user"
            }, {
                "name": "fnd0IsCheckoutable"
            }, {
                "name": "is_modifiable"
            }, {
                "name": "object_desc"
            }, {
                "name": "object_name"
            }, {
                "name": "object_string"
            }, {
                "name": "process_stage_list",
                "modifiers": [ {
                    "name": "withProperties",
                    "Value": "true"
                } ]
            }, {
                "name": "release_status_list"
            }, {
                "name": "structure_revisions"
            } ]
        }
    ]
};

export default exports = {
    defaultProperties,
    summary,
    summaryEdit,
    gateway
};
/**
 * TODO
 *
 * @memberof NgServices
 * @member propertyPolicyCache
 */
app.factory( 'propertyPolicyCache', () => exports );
