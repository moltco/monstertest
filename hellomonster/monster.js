
const graphql = require('graphql');
const { nodeDefinitions, fromGlobalId, globalIdField } = require('graphql-relay');
const joinMonster = require('join-monster').default;

/// This query will fail:
/// query { node(id:"VXNlcjplZmNkMmE3MC02M2EyLTRhZDMtYTY2OS1kY2FiYzYyMzhmMmM=")  {id} }

// failing with: "def.args is not iterable"
// raised by joinMonster: query-ast-to-sql-ast/index.js:116:0 -> "sqlASTNode.args = (0, _values.getArgumentValues)(field, queryASTNode, this.variableValues);"
// by grapql:/execution/value.js:183:24 (getArgumentValues: "for (const argDef of def.args)" where passed def is {} - ie not iterable)

/// This query will succeed:
///  query { user(id:"VXNlcjplZmNkMmE3MC02M2EyLTRhZDMtYTY2OS1kY2FiYzYyMzhmMmM=")  {id name} }

// const fetchQuery= async(query, server='') => {
//   return await fetch(server + '/graphql', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json',
//     },
//     body: JSON.stringify({query: query})
//   })
//     .then(r => r.json())
//     .then(data => console.log('Data returned:', data));
// }

const dbExec = (sql) => {
    console.log("SQL: " + sql);
    return [{
        // User:efcd2a70-63a2-4ad3-a669-dcabc6238f2c
        // VXNlcjplZmNkMmE3MC02M2EyLTRhZDMtYTY2OS1kY2FiYzYyMzhmMmM=
        id: 'VXNlcjplZmNkMmE3MC02M2EyLTRhZDMtYTY2OS1kY2FiYzYyMzhmMmM=', //base64 encoded global ID ("User:efcd2a70-63a2-4ad3-a669-dcabc6238f2c")
        name: 'Test User'
    }]
}

const { nodeInterface, nodeField } = nodeDefinitions(
    // https://join-monster.readthedocs.io/en/v0.9.9/relay/
    // resolve the ID to an object
    (globalId, context, resolveInfo) => {
      // parse the globalID
      const { type, id } = fromGlobalId(globalId)

      // pass the type name and other info. `joinMonster` will find the type from the name and write the SQL
      return joinMonster.getNode(type, resolveInfo, context, id,//String(id), 
        async sql => dbExec(sql)
      )
    },
    // determines the type. Join Monster places that type onto the result object on the "__type__" property
    obj => obj.__type__
  )

  const User = new graphql.GraphQLObjectType({
    name: 'User',
    sqlTable: 'public.user', 
    interfaces: [ nodeInterface ],
    description: 'User model',
    extensions: {
      joinMonster: {
        sqlTable: 'public.user',
        uniqueKey: 'email'
      }
    },
    fields: () => {
        return {
            id: {...globalIdField(), },
            name: {type: graphql.GraphQLString},
        }
    },
});



const QueryRoot = new graphql.GraphQLObjectType({
    name: 'Query', 
    fields: () => ({
    node: nodeField,
    user: {
        type: User,
        description: "get user information",
        args: { 
            id: { type:graphql.GraphQLID } 
        },
        resolve: async(parent, args, context, resolveInfo) => {
            return await joinMonster(resolveInfo, context, async sql =>{ 
                return dbExec(sql);
                });
        }
    } 
    })
});

const schema = new graphql.GraphQLSchema({ 
    query: QueryRoot,
});

module.exports = {
  schema,
  //fetchQuery
}
  