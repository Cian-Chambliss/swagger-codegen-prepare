## Swagger Code Generation Prepare

Prepare swagger definition for template engine consumption.

This is adapted from swagger-js-codegen, only keeping the logic that prepares the object for template engine. This is intended to be used in conjunction with either mustache or handlebars.

Installation

```sh
npm install swagger-js-codegen
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
## Example Code Generator

Example using the optional 'convertType' method and 'defaultType' parameter

```javascript
var Handlebars = require("handlebars");
var prep = require("swagger-codegen-prepare");
var swagger = require("./petstore.json");
var convertType = function(swaggerType, swagger) {
    var name = "std::string";
    if (swaggerType.type === 'array') {
        if (swaggerType.items) {
            name = "std::vector< " + convertType(swaggerType.items, swagger).name + " >";
        } else {
            name = "std::vector< std::string >";
        }
    } else if (swaggerType.type && swaggerType.type !== "string") {
        name = swaggerType.type;
    }
    return { name: name };
};
var data = prep.SwaggerPrepare({ swagger: swagger, className: "PetStore", convertType: convertType, defaultType: { type: "string", __type: { "name": "std::string" } } });
var source = [
    'class {{className}}_iface {',
    '  {{#methods}}',
    '     //-------------------------',
    '     //{{&summary}}', [
        '     virtual {{&return.__type.name}} {{&methodName}}(',
        '{{#parameters}}',
        '{{#notFirstParameter}} , {{/notFirstParameter}}',
        '{{&__type.name}} {{&name}}',
        '{{/parameters}}',
        ') = NULL;'
    ].join(''),
    '{{/methods}}',
    '};',
].join("\n");
var template = Handlebars.compile(source);
var result = template(data);
console.log(result);
```

Running the above example with the Petstore swagger example produces the below content.

```c++
class PetStore_iface {
     //-------------------------
     //Add a new pet to the store
     virtual std::string addPet(std::string body) = NULL;
     //-------------------------
     //Update an existing pet
     virtual std::string updatePet(std::string body) = NULL;
     //-------------------------
     //Multiple status values can be provided with comma separated strings
     virtual std::string findPetsByStatus(std::vector< std::string > status) = NULL;
     //-------------------------
     //Muliple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     virtual std::string findPetsByTags(std::vector< std::string > tags) = NULL;
     //-------------------------
     //Returns a single pet
     virtual std::string getPetById(integer petId) = NULL;
     //-------------------------
     //Updates a pet in the store with form data
     virtual std::string updatePetWithForm(integer petId , std::string name , std::string status) = NULL;
     //-------------------------
     //Deletes a pet
     virtual std::string deletePet(std::string api_key , integer petId) = NULL;
     //-------------------------
     //uploads an image
     virtual std::string uploadFile(integer petId , std::string additionalMetadata , file file) = NULL;
     //-------------------------
     //Returns a map of status codes to quantities
     virtual std::string getInventory() = NULL;
     //-------------------------
     //Place an order for a pet
     virtual std::string placeOrder(std::string body) = NULL;
     //-------------------------
     //For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     virtual std::string getOrderById(integer orderId) = NULL;
     //-------------------------
     //For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     virtual std::string deleteOrder(integer orderId) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string createUser(std::string body) = NULL;
     //-------------------------
     //Creates list of users with given input array
     virtual std::string createUsersWithArrayInput(std::string body) = NULL;
     //-------------------------
     //Creates list of users with given input array
     virtual std::string createUsersWithListInput(std::string body) = NULL;
     //-------------------------
     //Logs user into the system
     virtual std::string loginUser(std::string username , std::string password) = NULL;
     //-------------------------
     //Logs out current logged in user session
     virtual std::string logoutUser() = NULL;
     //-------------------------
     //Get user by user name
     virtual std::string getUserByName(std::string username) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string updateUser(std::string username , std::string body) = NULL;
     //-------------------------
     //This can only be done by the logged in user.
     virtual std::string deleteUser(std::string username) = NULL;
};
```