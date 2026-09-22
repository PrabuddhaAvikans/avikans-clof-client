import type {
  WorkflowCondition,
  WorkflowConditionField,
  WorkflowConditionOperator,
  WorkflowSelectionContext,
} from "@/types/workflow";

export const WORKFLOW_CONDITION_FIELDS: {
  value: WorkflowConditionField;
  label: string;
}[] = [
  { value: "orderAmount", label: "Order amount" },
  { value: "discountPercent", label: "Discount %" },
  { value: "orderPriority", label: "Order priority" },
  { value: "orderKind", label: "Order kind" },
  { value: "quotationType", label: "Quotation type" },
  { value: "customerType", label: "Customer type" },
  { value: "productType", label: "Product type" },
  { value: "department", label: "Department" },
  { value: "branch", label: "Branch" },
];

export const WORKFLOW_CONDITION_OPERATORS: {
  value: WorkflowConditionOperator;
  label: string;
}[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "in", label: "is one of" },
];

const NUMERIC_FIELDS = new Set<WorkflowConditionField>(["orderAmount", "discountPercent"]);

function readContextValue(
  context: WorkflowSelectionContext,
  field: WorkflowConditionField,
): string | number | undefined {
  switch (field) {
    case "orderAmount":
      return context.orderAmount;
    case "discountPercent":
      return context.discountPercent;
    case "orderPriority":
      return context.orderPriority;
    case "orderKind":
      return context.orderKind;
    case "quotationType":
      return context.quotationType;
    case "customerType":
      return context.customerType;
    case "productType":
      return context.productType;
    case "department":
      return context.department;
    case "branch":
      return context.branch;
    default:
      return undefined;
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function conditionMatches(
  condition: WorkflowCondition,
  context: WorkflowSelectionContext,
): boolean {
  const actual = readContextValue(context, condition.field);
  if (actual == null || actual === "") return false;

  if (NUMERIC_FIELDS.has(condition.field) || ["lt", "lte", "gt", "gte"].includes(condition.operator)) {
    const left = toNumber(actual);
    const right = toNumber(condition.value);
    if (left == null || right == null) return false;
    switch (condition.operator) {
      case "eq":
        return left === right;
      case "neq":
        return left !== right;
      case "lt":
        return left < right;
      case "lte":
        return left <= right;
      case "gt":
        return left > right;
      case "gte":
        return left >= right;
      default:
        return false;
    }
  }

  const left = String(actual).trim().toLowerCase();
  const right = String(condition.value).trim().toLowerCase();
  if (condition.operator === "in") {
    return right
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .includes(left);
  }
  if (condition.operator === "eq") return left === right;
  if (condition.operator === "neq") return left !== right;
  return false;
}

export function ruleMatches(
  conditions: WorkflowCondition[],
  context: WorkflowSelectionContext,
): boolean {
  if (conditions.length === 0) return false;
  return conditions.every((condition) => conditionMatches(condition, context));
}
