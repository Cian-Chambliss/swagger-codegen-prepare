## Swagger Code Generation Prepare

Prepare swagger definition for template engine consumption.

This is adapted from swagger-js-codegen, only keeping the logic that prepares the object for template engine. This is intended to be used in conjunction with either mustache or handlebars.

Installation

```sh
npm install swagger-codegen-prepare
```

### Template Variables
The following data are passed to the [mustache templates](https://github.com/janl/mustache.js):

```yaml
description:
  type: string
  description: Provided by your options field: 'swagger.info.description'
isSecure:
  type: boolean
  description: false unless 'swagger.securityDefinitions' is defined
moduleName:
  type: string
  description: Your AngularJS module name - provided by your options field
className:
  type: string
  description: Provided by your options field
domain:
  type: string
  description: If all options defined: swagger.schemes[0] + '://' + swagger.host + swagger.basePath
info:
  type: string
  description: Provided by your options field: 'swagger.info' 
host:
  type: string
  description: Provided by your options field: 'swagger.host' 
basePath:
  type: string
  description: Provided by your options field: 'swagger.basePath' 
methods:
  type: array
  items:
    type: object
    properties:
      path:
        type: string
      className:
        type: string
        description: Provided by your options field
      methodName:
        type: string
        description: Generated from the HTTP method and path elements or 'x-swagger-js-method-name' field
      method:
        type: string
        description: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'COPY', 'HEAD', 'OPTIONS', 'LINK', 'UNLIK', 'PURGE', 'LOCK', 'UNLOCK', 'PROPFIND'
        enum:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
        - COPY
        - HEAD
        - OPTIONS
        - LINK
        - UNLIK
        - PURGE
        - LOCK
        - UNLOCK
        - PROPFIND
      isGET:
        type: string
        description: true if method === 'GET'
      summary:
        type: string
        description: Provided by the 'description' or 'summary' field in the schema
      externalDocs:
        type: object
        properties:
          url:
            type: string
            description: The URL for the target documentation. Value MUST be in the format of a URL.
            required: true
          description:
            type: string
            description: A short description of the target documentation. GitHub-Markdown syntax can be used for rich text representation.
      isSecure:
        type: boolean
        description: true if the 'security' is defined for the method in the schema
      parameters:
        type: array
        description: Includes all of the properties defined for the parameter in the schema plus:
        items:
          camelCaseName:
            type: string
          isSingleton:
            type: boolean
            description: true if there was only one 'enum' defined for the parameter
          singleton:
            type: string
            description: the one and only 'enum' defined for the parameter (if there is only one)
          isBodyParameter:
            type: boolean
          isPathParameter:
            type: boolean
          isQueryParameter:
            type: boolean
          isPatternType:
            type: boolean
            description: true if *in* is 'query', and 'pattern' is defined
          isHeaderParameter:
            type: boolean
          isFormParameter:
            type: boolean
      byIn:
        type: object
        description: parameters grouped by 'in'. 
        items:
          path:
            type: parameter
          query:
            type: parameter
          body:
            type: parameter
          header:
            type: parameter
          formData:
            type: parameter
          hasPath:
            type: boolean
          hasQuery:
            type: boolean
          hasBody:
            type: boolean
          hasHeader:
            type: boolean
          hasFormData:
            type: boolean
        consumes:
            type: object
        produces:
            type: object
        hasConsumes:
            type: boolean
            description: consumes section exists. 
        hasProduces:
            type: boolean
            description: produces section exists. 
```


## Simple Example

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

Output of the above code for the petstore example.

```
PetStore
  - addPet : Add a new pet to the store
  - updatePet : Update an existing pet
  - findPetsByStatus : Multiple status values can be provided with comma separated strings
  - findPetsByTags : Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
  - getPetById : Returns a single pet
  - updatePetWithForm : Updates a pet in the store with form data
  - deletePet : Deletes a pet
  - uploadFile : uploads an image
  - getInventory : Returns a map of status codes to quantities
  - placeOrder : Place an order for a pet
  - getOrderById : For valid response try integer IDs with value &gt;&#x3D; 1 and &lt;&#x3D; 10. Other values will generated exceptions
  - deleteOrder : For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
  - createUser : This can only be done by the logged in user.
  - createUsersWithArrayInput : Creates list of users with given input array
  - createUsersWithListInput : Creates list of users with given input array
  - loginUser : Logs user into the system
  - logoutUser : Logs out current logged in user session
  - getUserByName : Get user by user name
  - updateUser : This can only be done by the logged in user.
  - deleteUser : This can only be done by the logged in user.
```

## Example Code Generator

Example using the optional 'convertType' method and 'defaultType' parameter.

```javascript
var Handlebars = require("handlebars");
var prep = require("swagger-codegen-prepare");
var swagger = require("./petstore.json");
var convertType = function(swaggerType, swagger) {
    var name = "std::string";
    var isRef = false;
    if (swaggerType.schema) {
        if (swaggerType.schema.type || swaggerType.schema.$ref) {
            return convertType(swaggerType.schema);
        }
    }
    if (swaggerType.type === 'array') {
        isRef = true;
        if (swaggerType.items) {
            name = "std::vector< " + convertType(swaggerType.items, swagger).name + " >";
        } else {
            name = "std::vector< std::string >";
        }
    } else if (swaggerType.type === 'integer') {
        name = "int";
    } else {
        if (swaggerType.type && swaggerType.type !== "string" && swaggerType.type !== "file") {
            name = swaggerType.type;
        }
        if (swaggerType.$ref) {
            name = swaggerType.$ref.substring(swaggerType.$ref.lastIndexOf('/') + 1);
            isRef = true;
        }
    }
    return { name: name, isRef: isRef };
};
var data = prep.SwaggerPrepare({ swagger: swagger, className: "PetStore", convertType: convertType, defaultType: { type: "string", __type: { "name": "std::string" } } });
var source = [
    'class {{className}}_iface {',
    'public:',
    '  {{#methods}}',
    '     //-------------------------',
    '     //{{&summary}}', 
    [
        '     virtual {{&return.__type.name}} {{&methodName}}(',
        '{{#parameters}}',
        '{{#notFirstParameter}} , {{/notFirstParameter}}',
        '{{&__type.name}}  {{#__type.isRef}}&{{/__type.isRef}}{{&name}}',
        '{{/parameters}}',
        ') = NULL;'
    ].join(''),
    '{{/methods}}',
    '};',
    '{{#definitions}}',
    '{{#hasProperties}}',
    '',
    'class {{name}} {',
    'public:',
    '{{#properties}}',
    '   {{&__type.name}} {{&name}};',
    '{{/properties}}',
    '};',
    '{{/hasProperties}}',
    '{{/definitions}}',
].join("\n");
var template = Handlebars.compile(source);
var result = template(data);
console.log(result);
```

Running the above example with the Petstore swagger example produces the below content.

```c++
class PetStore_iface {
public:
     //-------------------------
     //Add a new pet to the store
     virtual std::string addPet(Pet  &body) = NULL;
     //-------------------------
     //Update an existing pet
     virtual std::string updatePet(Pet  &body) = NULL;
     //-------------------------
     //Multiple status values can be provided with comma separated strings
     virtual std::string findPetsByStatus(std::vector< std::string >  &status) = NULL;
     //-------------------------
     //Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     virtual std::string findPetsByTags(std::vector< std::string >  &tags) = NULL;
     //-------------------------
     //Returns a single pet
     virtual std::string getPetById(int  petId) = NULL;
     //-------------------------
     //Updates a pet in the store with form data
     virtual std::string updatePetWithForm(int  petId , std::string  name , std::string  status) = NULL;
     //-------------------------
     //Deletes a pet
     virtual std::string deletePet(std::string  api_key , int  petId) = NULL;
     //-------------------------
     //uploads an image
     virtual std::string uploadFile(int  petId , std::string  additionalMetadata , std::string  file) = NULL;
     //-------------------------
     //Returns a map of status codes to quantities
     virtual std::string getInventory() = NULL;
     //-------------------------
     //Place an order for a pet
     virtual std::string placeOrder(Order  &body) = NULL;
     //-------------------------
     //For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     virtual std::string getOrderById(int  orderId) = NULL;
     //-------------------------
     //For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     virtual std::string deleteOrder(int  orderId) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string createUser(User  &body) = NULL;
     //-------------------------
     //Creates list of users with given input array
     virtual std::string createUsersWithArrayInput(std::vector< User >  &body) = NULL;
     //-------------------------
     //Creates list of users with given input array
     virtual std::string createUsersWithListInput(std::vector< User >  &body) = NULL;
     //-------------------------
     //Logs user into the system
     virtual std::string loginUser(std::string  username , std::string  password) = NULL;
     //-------------------------
     //Logs out current logged in user session
     virtual std::string logoutUser() = NULL;
     //-------------------------
     //Get user by user name
     virtual std::string getUserByName(std::string  username) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string updateUser(std::string  username , User  &body) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string deleteUser(std::string  username) = NULL;
};

class Order {
public:
   int id;
   int petId;
   int quantity;
   std::string shipDate;
   std::string status;
   boolean complete;
};

class Category {
public:
   int id;
   std::string name;
};

class User {
public:
   int id;
   std::string username;
   std::string firstName;
   std::string lastName;
   std::string email;
   std::string password;
   std::string phone;
   int userStatus;
};

class Tag {
public:
   int id;
   std::string name;
};

class Pet {
public:
   int id;
   Category category;
   std::string name;
   std::vector< std::string > photoUrls;
   std::vector< Tag > tags;
   std::string status;
};

class ApiResponse {
public:
   int code;
   std::string type;
   std::string message;
};
```
## Example Producing HTML Documentation

The following script produces a rough approximation of the document output from swaggers html generator.

```javascript
var Handlebars = require("handlebars");
var prep = require("swagger-codegen-prepare");
var swagger = require("./petstore.json");
var data = prep.SwaggerPrepare({ swagger: swagger, className: "PetStore" });
var fs = require("fs");
var source = fs.readFileSync("./htmldoc.mustache", "utf8");
var template = Handlebars.compile(source);
var result = template(data);
console.log(result);
```

The 'htmldoc.mustache' template file used by the above script.

```mustache
<html>
    <head>
    <title>{{info.title}}</title>
    <style type="text/css">
      body {
        font-family: Trebuchet MS, sans-serif;
        font-size: 15px;
        color: #444;
        margin-right: 24px;
      }
      h1	{
        font-size: 25px;
      }
      h2	{
        font-size: 20px;
      }
      h3	{
        font-size: 16px;
        font-weight: bold;
      }
      hr	{
        height: 1px;
        border: 0;
        color: #ddd;
        background-color: #ddd;
      }
      .app-desc {
        clear: both;
        margin-left: 20px;
      }
      .param-name {
        width: 100%;
      }
      .license-info {
        margin-left: 20px;
      }
      .license-url {
        margin-left: 20px;
      }
      .model {
        margin: 0 0 0px 20px;
      }
      .method {
        margin-left: 20px;
      }
      .method-notes	{
        margin: 10px 0 20px 0;
        font-size: 90%;
        color: #555;
      }
      pre {
        padding: 10px;
        margin-bottom: 2px;
      }
      .http-method {
      text-transform: uppercase;
      }
      pre.get {
        background-color: #0f6ab4;
      }
      pre.post {
        background-color: #10a54a;
      }
      pre.put {
        background-color: #c5862b;
      }
      pre.delete {
        background-color: #a41e22;
      }
      .huge	{
        color: #fff;
      }
      pre.example {
        background-color: #f3f3f3;
        padding: 10px;
        border: 1px solid #ddd;
      }
      code {
        white-space: pre;
      }
      .nickname {
        font-weight: bold;
      }
      .method-path {
        font-size: 1.5em;
        background-color: #0f6ab4;
      }
      .up {
        float:right;
      }
      .parameter {
        width: 500px;
      }
      .param {
        width: 500px;
        padding: 10px 0 0 20px;
        font-weight: bold;
      }
      .param-desc {
        width: 700px;
        padding: 0 0 0 20px;
        color: #777;
      }
      .param-type {
        font-style: italic;
      }
      .param-enum-header {
      width: 700px;
      padding: 0 0 0 60px;
      color: #777;
      font-weight: bold;
      }
      .param-enum {
      width: 700px;
      padding: 0 0 0 80px;
      color: #777;
      font-style: italic;
      }
      .field-label {
        padding: 0;
        margin: 0;
        clear: both;
      }
      .field-items	{
        padding: 0 0 15px 0;
        margin-bottom: 15px;
      }
      .return-type {
        clear: both;
        padding-bottom: 10px;
      }
      .param-header {
        font-weight: bold;
      }
      .method-tags {
        text-align: right;
      }
      .method-tag {
        background: none repeat scroll 0% 0% #24A600;
        border-radius: 3px;
        padding: 2px 10px;
        margin: 2px;
        color: #FFF;
        display: inline-block;
        text-decoration: none;
      }
    </style>
  </head>
<body>
{{#info}}
<h1>{{title}}</h1>
<div class="app-desc">{{description}}</div>
{{#contact}}
<div class = "app-desc">Contact Info: <a href="{{&email}}">{{email}}</a></div>
{{/contact}}
<div class = "app-desc">{{version}}</div>
{{#license}}
<div class = "license-info">{{name}}</div>
<div class = "license-url">{{url}}</div>
{{/license}}
{{/info}}
<div class = "app-desc" > BasePath:{{basePath}}</div >
<h2><a name="__Methods ">Methods</a></h2>
<h3>Table of Contents </h3>
<div class="method-summary"></div>
{{#byTags}}
{{#tags}}
<h4><a href="#{{name}}">{{name}}</a></h4>
<p>{{description}}</p>
{{/tags}}
<ul>
{{#methods}}
<li><a href="#{{methodName}}{{method}}"><code><span class="http-method">{{method}}</span> {{path}}</code></a></li>
{{/methods}}
</ul>
{{/byTags}}
<h1><a name="{{className}}">{{className}}</a></h1>
{{#methods}}
<div class="method"><a name="{{methodName}}{{method}}"/>
<div class="method-path">
<a class="up" href="#__Methods">Up</a>
<pre class="{{method}}"><code class="huge"><span class="http-method">{{method}}</span> {{path}}</code></pre></div>
<div class="method-summary">{{summary}}</div>
{{#hasConsumes}}
 <h3 class="field-label">Consumes</h3>
    This API call consumes the following media types via the <span class="heaader">Content-Type</span> request header:
    <ul>
    {{#consumes}}
      <li><code>{{.}}</code></li>
    {{/consumes}}
    </ul>
{{/hasConsumes}}
{{#byIn}}
{{#hasPath}}
<h3 class="field-label">Path parameters</h3>
<div class="field-items">
      {{#path}}
      <div class="param">{{name}} {{#required}}(required){{/required}}</div>
      <div class="param-desc"><span class="param-type">Path Parameter</span> — {{description}} </div>
      {{/path}}
</div>
{{/hasPath}}
{{#hasQuery}}
<h3 class="field-label">Query parameters</h3>
<div class="field-items">
      {{#query}}
      <div class="param">{{name}} {{#required}}(required){{/required}}</div>
      <div class="param-desc"><span class="param-type">Query Parameter</span> — {{description}} </div>
      {{/query}}
</div>
{{/hasQuery}}
{{#hasBody}}
<h3 class="field-label">Request body</h3>
<div class="field-items">
      {{#body}}
      <div class="param">{{name}} {{#required}}(required){{/required}}</div>
      <div class="param-desc"><span class="param-type">Body Parameter</span> — {{description}} </div>
      {{/body}}
</div>
{{/hasBody}}

{{#hasHeader}}
<h3 class="field-label">Header parameters</h3>
<div class="field-items">
      {{#header}}
      <div class="param">{{name}} {{#required}}(required){{/required}}</div>
      <div class="param-desc"><span class="param-type">Header Parameter</span> — {{description}} </div>
      {{/header}}
</div>
{{/hasHeader}}

{{#hasFormData}}
<h3 class="field-label">Form parameters</h3>
<div class="field-items">
      {{#formData}}
      <div class="param">{{name}} {{#required}}(required){{/required}}</div>
      <div class="param-desc"><span class="param-type">Form Parameter</span> — {{description}} </div>
      {{/formData}}
</div>
{{/hasFormData}}

{{/byIn}}
{{#hasProduces}}
    <h3 class="field-label">Produces</h3>
    This API call produces the following media types according to the <span class="header">Accept</span> request header;
    the media type will be conveyed by the <span class="heaader">Content-Type</span> response header.
    <ul>
    {{#produces}}
      <li><code>{{.}}</code></li>
    {{/produces}}
    </ul>
{{/hasProduces}}
{{#hasResponses}}
    <h3 class="field-label">Responses</h3>
{{#responses}}
    <h4 class="field-label">{{responseCode}}</h4>
    {{description}}
{{/responses}}
{{/hasResponses}}
</div>
<hr/>
{{/methods}}
<h2><a name="__Models">Models</a></h2>
<h3>Table of Contents</h3>
<ol>
{{#definitions}}
    <li><a href="#{{name}}"><code>{{name}}</code> - </a></li>
{{/definitions}}
</ol>

{{#definitions}}
<div class="model">
    <h3><a name="{{name}}"><code>{{name}}</code> - </a> <a class="up" href="#__Models">Up</a></h3>
    <div class="model-description"></div>
    <div class="field-items">
    {{#properties}}
<div class="param">{{name}} </div><div class="param-desc"><span class="param-type"><a href="#{{definition.type}}">{{definition.type}}</a></span>  format: {{definition.format}}</div>
    {{/properties}}
    </div>  <!-- field-items -->
  </div>
{{/definitions}}
</body>
</html>
```