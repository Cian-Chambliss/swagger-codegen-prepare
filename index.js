var _ = require('lodash');

var normalizeName = function(id) {
    return id.replace(/\.|\-|\{|\}/g, '_');
};

var getPathToMethodName = function(opts, m, path) {
    if (path === '/' || path === '') {
        return m;
    }

    // clean url path for requests ending with '/'
    var cleanPath = path.replace(/\/$/, '');

    var segments = cleanPath.split('/').slice(1);
    segments = _.transform(segments, function(result, segment) {
        if (segment[0] === '{' && segment[segment.length - 1] === '}') {
            segment = 'by' + segment[1].toUpperCase() + segment.substring(2, segment.length - 1);
        }
        result.push(segment);
    });
    var result = _.camelCase(segments.join('-'));
    return m.toLowerCase() + result[0].toUpperCase() + result.substring(1);
};

var sortParameterByIn = function(method, parameter) {
    if (parameter.in === 'body') {
        if (!method.byIn.body) {
            method.byIn.body = [parameter];
            method.byIn.hasBody = true;
        } else {
            parameter.notFirstByIn = true;
            method.byIn.body.push(parameter);
        }
    } else if (parameter.in === 'path') {
        if (!method.byIn.path) {
            method.byIn.path = [parameter];
            method.byIn.hasPath = true;
        } else {
            parameter.notFirstByIn = true;
            method.byIn.path.push(parameter);
        }
    } else if (parameter.in === 'query') {
        if (!method.byIn.query) {
            method.byIn.query = [parameter];
            method.byIn.hasQuery = true;
        } else {
            parameter.notFirstByIn = true;
            method.byIn.query.push(parameter);
        }
    } else if (parameter.in === 'header') {
        if (!method.byIn.header) {
            method.byIn.header = [parameter];
            method.byIn.hasHeader = true;
        } else {
            parameter.notFirstByIn = true;
            method.byIn.header.push(parameter);
        }
    } else if (parameter.in === 'formData') {
        if (!method.byIn.formData) {
            method.byIn.formData = [parameter];
            method.byIn.hasFormData = true;
        } else {
            parameter.notFirstByIn = true;
            method.byIn.formData.push(parameter);
        }
    }
};

var getViewForSwagger2 = function(opts) {
    var swagger = opts.swagger;
    var methods = [];
    var authorizedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'COPY', 'HEAD', 'OPTIONS', 'LINK', 'UNLINK', 'PURGE', 'LOCK', 'UNLOCK', 'PROPFIND'];
    var hasTags = false;
    var byTags = null;
    if (swagger.tags) {
        hasTags = true;
        byTags = [];
    }
    var data = {
        description: swagger.info.description,
        info: swagger.info,
        host: swagger.host,
        basePath: swagger.basePath,
        hasTags: hasTags,
        tags: swagger.tags,
        schemes: swagger.schemes,
        isSecure: swagger.securityDefinitions !== undefined,
        moduleName: opts.moduleName,
        className: opts.className,
        imports: opts.imports,
        domain: (swagger.schemes && swagger.schemes.length > 0 && swagger.host && swagger.basePath) ? swagger.schemes[0] + '://' + swagger.host + swagger.basePath.replace(/\/+$/g, '') : '',
        methods: [],
        byTags: byTags,
        definitions: []
    };
    var lastPath = null;

    _.forEach(swagger.definitions, function(definition, name) {
        var newDef = {
            name: name,
            description: definition.description
        };
        if (definition.properties) {
            var props = [];
            _.forEach(definition.properties, function(propertyType, propertyName) {
                var newProp = { name: propertyName, definition: propertyType };
                if (opts.convertType) {
                    newProp[opts.typePropertyName] = opts.convertType(propertyType, swagger, opts);
                }
                props.push(newProp);
            });
            newDef.properties = props;
            newDef.hasProperties = true;
        }
        if (opts.convertType) {
            newDef[opts.typePropertyName] = opts.convertType(definition, swagger, opts);
        }
        data.definitions.push(newDef);
    });


    _.forEach(swagger.paths, function(api, path) {
        var globalParams = [];
        /**
         * @param {Object} op - meta data for the request
         * @param {string} m - HTTP method name - eg: 'get', 'post', 'put', 'delete'
         */
        _.forEach(api, function(op, m) {
            if (m.toLowerCase() === 'parameters') {
                globalParams = op;
            }
        });
        _.forEach(api, function(op, m) {
            var M = m.toUpperCase();
            if (M === '' || authorizedMethods.indexOf(M) === -1) {
                return;
            }
            var secureTypes = [];
            if (swagger.securityDefinitions !== undefined || op.security !== undefined) {
                var mergedSecurity = _.merge([], swagger.security, op.security).map(function(security) {
                    return Object.keys(security);
                });
                if (swagger.securityDefinitions) {
                    for (var sk in swagger.securityDefinitions) {
                        if (mergedSecurity.join(',').indexOf(sk) !== -1) {
                            secureTypes.push(swagger.securityDefinitions[sk].type);
                        }
                    }
                }
            }
            var methodName = (op.operationId ? normalizeName(op.operationId) : getPathToMethodName(opts, m, path));
            // Make sure the method name is unique
            if (methods.indexOf(methodName) !== -1) {
                var i = 1;
                while (true) {
                    if (methods.indexOf(methodName + '_' + i) !== -1) {
                        i++;
                    } else {
                        methodName = methodName + '_' + i;
                        break;
                    }
                }
            }
            methods.push(methodName);
            var tagGroup = "none";
            if (op.tags) {
                tagGroup = op.tags.join(",");
            }
            var method = {
                path: path,
                className: opts.className,
                methodName: methodName,
                operationId: op.operationId,
                tags: op.tags,
                tagGroup: tagGroup,
                method: M,
                isGET: M === 'GET',
                isPOST: M === 'POST',
                summary: op.description || op.summary,
                description: op.description,
                externalDocs: op.externalDocs,
                isSecure: swagger.security !== undefined || op.security !== undefined,
                isSecureToken: secureTypes.indexOf('oauth2') !== -1,
                isSecureApiKey: secureTypes.indexOf('apiKey') !== -1,
                isSecureBasic: secureTypes.indexOf('basic') !== -1,
                parameters: [],
                byIn: {},
                headers: []
            };
            if (op.produces) {
                method.produces = op.produces;
            }
            if (op.consumes) {
                method.consumes = op.consumes;
            }
            if (method.isSecure && method.isSecureToken) {
                data.isSecureToken = method.isSecureToken;
            }
            if (method.isSecure && method.isSecureApiKey) {
                data.isSecureApiKey = method.isSecureApiKey;
            }
            if (method.isSecure && method.isSecureBasic) {
                data.isSecureBasic = method.isSecureBasic;
            }
            var produces = op.produces || swagger.produces;
            if (produces) {
                method.headers.push({
                    name: 'Accept',
                    value: "'${produces.map(function(value) { return value; }).join(', ')}'",
                });
                method.hasProduces = true;
            }

            var consumes = op.consumes || swagger.consumes;
            if (consumes) {
                method.headers.push({ name: 'Content-Type', value: '\'' + consumes + '\'' });
                method.hasConsumes = true;
            }

            var params = [];
            if (_.isArray(op.parameters)) {
                params = op.parameters;
            }
            params = params.concat(globalParams);
            _.forEach(params, function(parameter) {
                //Ignore parameters which contain the x-exclude-from-bindings extension
                if (parameter['x-exclude-from-bindings'] === true) {
                    return;
                }

                // Ignore headers which are injected by proxies & app servers
                // eg: https://cloud.google.com/appengine/docs/go/requests#Go_Request_headers
                if (parameter['x-proxy-header'] && !data.isNode) {
                    return;
                }
                if (_.isString(parameter.$ref)) {
                    var segments = parameter.$ref.split('/');
                    parameter = swagger.parameters[segments.length === 1 ? segments[0] : segments[2]];
                }
                parameter.camelCaseName = _.camelCase(parameter.name);
                if (parameter.enum && parameter.enum.length === 1) {
                    parameter.isSingleton = true;
                    parameter.singleton = parameter.enum[0];
                }

                if (parameter.in === 'body') {
                    parameter.isBodyParameter = true;
                } else if (parameter.in === 'path') {
                    parameter.isPathParameter = true;
                } else if (parameter.in === 'query') {
                    if (parameter['x-name-pattern']) {
                        parameter.isPatternType = true;
                        parameter.pattern = parameter['x-name-pattern'];
                    }
                    parameter.isQueryParameter = true;
                } else if (parameter.in === 'header') {
                    parameter.isHeaderParameter = true;
                } else if (parameter.in === 'formData') {
                    parameter.isFormParameter = true;
                }
                if (opts.convertType) {
                    parameter[opts.typePropertyName] = opts.convertType(parameter, swagger, opts);
                }
                parameter.cardinality = parameter.required ? '' : '?';
                if (method.parameters.length !== 0) {
                    parameter.notFirstParameter = true;
                }
                method.parameters.push(parameter);
                // Indexed by 'in'
                sortParameterByIn(method, parameter);
            });
            if (method.byIn.hasQuery && method.byIn.hasBody) {
                method.byIn.hasQueryAndBody = true;
            }
            if (op.responses) {
                method.responses = [];
                _.forEach(op.responses, function(response, r) {
                    var rVal = parseInt(r);
                    response.responseCode = r;
                    method.hasResponses = true;
                    if (0 < rVal && rVal < 400) {
                        if (response.schema && opts.convertType) {
                            var responseType = opts.convertType(response.schema, swagger, opts);
                            response.schema[opts.typePropertyName] = responseType;
                            if (!method.return) {
                                method.return = response.schema;
                            }
                        }
                    }
                    method.responses.push(response);
                });
                if (!method.return && opts.defaultType) {
                    method.return = opts.defaultType;
                }
            }
            if (lastPath !== method.path) {
                lastPath = method.path;
                method.isFirstPath = true;
            }
            if (data.methods.length !== 0) {
                method.notFirstMethod = true;
            }
            data.methods.push(method);
            if (byTags) {
                var index = _.findIndex(byTags, function(o) { return o.name === tagGroup; });
                if (index >= 0) {
                    method.notFirstByTag = true;
                    byTags[index].methods.push(method);
                } else {
                    var tagGroups = [];
                    if (method.tags) {
                        _.forEach(method.tags, function(tag) {
                            var tagIndex = _.findIndex(swagger.tags, function(o) { return o.name === tag; });
                            if (tagIndex >= 0) {
                                tagGroups.push(swagger.tags[tagIndex]);
                            }
                        });
                    }
                    byTags.push({ name: tagGroup, tags: tagGroups, methods: [method] });
                }
            }
        });
    });

    return data;
};

var getViewForSwagger1 = function(opts) {
    var swagger = opts.swagger;
    var data = {
        description: swagger.description,
        moduleName: opts.moduleName,
        className: opts.className,
        domain: swagger.basePath ? swagger.basePath : '',
        methods: []
    };
    var lastPath = null;
    swagger.apis.forEach(function(api) {
        api.operations.forEach(function(op) {
            if (op.method === 'OPTIONS') {
                return;
            }
            var method = {
                path: api.path,
                className: opts.className,
                methodName: op.nickname,
                method: op.method,
                isGET: op.method === 'GET',
                isPOST: op.method.toUpperCase() === 'POST',
                summary: op.summary,
                parameters: op.parameters,
                headers: [],
                byIn: {}
            };

            if (op.produces) {
                var headers = [];
                headers.value = [];
                headers.name = 'Accept';
                headers.value.push(op.produces.map(function(value) { return '\'' + value + '\''; }).join(', '));
                method.headers.push(headers);
                method.hasProduces = true;
            }

            op.parameters = op.parameters ? op.parameters : [];
            op.parameters.forEach(function(parameter) {
                parameter.camelCaseName = _.camelCase(parameter.name);
                if (parameter.enum && parameter.enum.length === 1) {
                    parameter.isSingleton = true;
                    parameter.singleton = parameter.enum[0];
                }
                if (parameter.paramType === 'body') {
                    parameter.isBodyParameter = true;
                } else if (parameter.paramType === 'path') {
                    parameter.isPathParameter = true;
                } else if (parameter.paramType === 'query') {
                    if (parameter['x-name-pattern']) {
                        parameter.isPatternType = true;
                        parameter.pattern = parameter['x-name-pattern'];
                    }
                    parameter.isQueryParameter = true;
                } else if (parameter.paramType === 'header') {
                    parameter.isHeaderParameter = true;
                } else if (parameter.paramType === 'form') {
                    parameter.isFormParameter = true;
                }
                // Indexed by 'in'
                sortParameterByIn(method, parameter);
            });
            if (method.byIn.hasQuery && method.byIn.hasBody) {
                method.byIn.hasQueryAndBody = true;
            }
            if (lastPath !== method.path) {
                lastPath = method.path;
            } else {
                method.isFirstPath = true;
            }
            if (data.methods.length !== 0) {
                method.notFirstMethod = true;
            }
            data.methods.push(method);
        });
    });
    return data;
};

exports.SwaggerPrepare = function(opts) {
    if (!opts.typePropertyName) {
        opts.typePropertyName = "__type";
    }
    // For Swagger Specification version 2.0 value of field 'swagger' must be a string '2.0'
    return opts.swagger.swagger === '2.0' ? getViewForSwagger2(opts) : getViewForSwagger1(opts);
};