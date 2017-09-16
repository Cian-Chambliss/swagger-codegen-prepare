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