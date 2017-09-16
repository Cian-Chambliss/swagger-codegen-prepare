## Swagger Code Generation Prepare

Prepare swagger definition for template engine consumption.

This is adapted from swagger-js-codegen, only keeping the logic that prepares the object for template engine. This is intended to be used in conjunction with either mustache or handlebars.

Installation

```sh
npm install swagger-js-codegen
```

## Example Usage

Prepare swagger, then use a handlebars template to generate output from the definition.

```javascript
var Handlebars = require("handlebars");
var prep = require("swagger-codegen-prepare");
var swagger = require("./petstore.json");
var data = prep.SwaggerPrepare({ swagger: swagger, className: "PetStore" });
// Dump a list of methods and descriptions
var source = [
    '{{className}}',
    '{{#methods}}',
    '  - {{methodName}} : {{summary}}',
    '{{/methods}}',
].join("\n");
var template = Handlebars.compile(source);
var result = template(data);
console.log(result);
```