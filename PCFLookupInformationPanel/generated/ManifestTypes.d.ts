/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    BoundLookupField: ComponentFramework.PropertyTypes.LookupProperty;
    Fields: ComponentFramework.PropertyTypes.StringProperty;
    Lists: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    BoundLookupField?: ComponentFramework.LookupValue[];
}
