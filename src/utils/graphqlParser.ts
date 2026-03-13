import { parse, DocumentNode, OperationDefinitionNode } from 'graphql';

export interface GraphQLOperation {
  name: string | null;           // Operation name or null for unnamed
  displayName: string;            // User-friendly name like "query #1" or "GetUser"
  type: 'query' | 'mutation' | 'subscription';
  definition: string;             // The full operation text
  startOffset: number;            // Start position in document
  endOffset: number;              // End position in document
}

export interface ParseResult {
  operations: GraphQLOperation[];
  errors: string[];               // Parse errors if any
}

/**
 * Parse GraphQL document and extract all operations
 */
export function parseGraphQLOperations(source: string): ParseResult {
  const result: ParseResult = {
    operations: [],
    errors: [],
  };

  // Handle empty or whitespace-only source
  if (!source || !source.trim()) {
    return result;
  }

  let documentNode: DocumentNode;

  try {
    documentNode = parse(source, { noLocation: false });
  } catch (error) {
    // Invalid GraphQL syntax
    result.errors.push(error instanceof Error ? error.message : 'Invalid GraphQL syntax');
    return result;
  }

  // Extract operation definitions
  const operations: OperationDefinitionNode[] = documentNode.definitions.filter(
    (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition'
  );

  // If no operations found (e.g., only fragments), return empty array
  if (operations.length === 0) {
    return result;
  }

  // Track operation counts by type for generating display names
  const typeCounts: Record<string, number> = {
    query: 0,
    mutation: 0,
    subscription: 0,
  };

  // Track names to detect duplicates
  const nameOccurrences = new Map<string, number>();

  operations.forEach((op) => {
    const opType = op.operation;
    typeCounts[opType]++;

    const operationName = op.name?.value || null;

    // Generate display name
    let displayName: string;
    if (operationName) {
      // Handle duplicate names
      const count = nameOccurrences.get(operationName) || 0;
      nameOccurrences.set(operationName, count + 1);

      if (count > 0) {
        displayName = `${operationName} (${count + 1})`;
      } else {
        displayName = operationName;
      }
    } else {
      // Unnamed operation - generate name like "query #1"
      displayName = `${opType} #${typeCounts[opType]}`;
    }

    // Extract operation text using location info
    let definition = '';
    if (op.loc) {
      definition = source.substring(op.loc.start, op.loc.end);
    }

    result.operations.push({
      name: operationName,
      displayName,
      type: opType,
      definition,
      startOffset: op.loc?.start || 0,
      endOffset: op.loc?.end || 0,
    });
  });

  return result;
}

/**
 * Extract a single operation from the source by name
 * @param source - Full GraphQL document
 * @param operationName - Name of operation to extract, or null for unnamed operation
 * @returns The extracted operation text, or null if not found
 */
export function extractOperation(source: string, operationName: string | null): string | null {
  const parseResult = parseGraphQLOperations(source);

  // If there are parse errors, return null
  if (parseResult.errors.length > 0) {
    return null;
  }

  // Find the operation
  const operation = parseResult.operations.find(op => {
    // Handle empty string as null (for unnamed operations)
    const targetName = operationName === '' ? null : operationName;
    return op.name === targetName;
  });

  if (!operation) {
    return null;
  }

  return operation.definition;
}