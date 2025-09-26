import {
  confirm as clackConfirm,
  isCancel,
  multiselect as clackMultiselect,
  select as clackSelect,
  text as clackText,
  cancel as clackCancel
} from '@clack/prompts';

import multiLevelSelect, {
  type SelectItem as MultiLevelSelectItem
} from '../components/mutiLevelSelect.js';

export type PromptType =
  | 'multiselect'
  | 'select'
  | 'text'
  | 'confirm'
  | 'multiLevelSelect';

export type PromptChoice<T = string> =
  | string
  | {
      name: string;
      value: T;
      hint?: string;
    };

export interface PromptParameter<T = unknown> {
  question: string; // Question displayed to user
  defaultValue?: T | T[] | boolean; // Default value
  label?: string; // Label for the question (can be used for logging)
  type: PromptType;
  choices?: Array<PromptChoice<T>>; // Only for select/multiselect
  pageSize?: number; // Number of items to display in list
  validate?: (input: string) => boolean | string; // Input validation
  treeItems?: MultiLevelSelectItem[]; // Only for multiLevelSelect
}

type ClackOption = { value: string; label: string; hint?: string };

function normalizeChoices<T = string>(
  choices?: Array<PromptChoice<T>>
): ClackOption[] | undefined {
  if (!choices) return undefined;
  return choices.map((c) => {
    if (typeof c === 'string') return { label: c, value: c };
    return { label: c.name, value: String(c.value), hint: c.hint };
  });
}

export async function promptParameter<T = unknown>(
  param: PromptParameter<T>
): Promise<T | T[] | boolean> {
  const { type, question, defaultValue, validate } = param;

  let value: T | T[] | boolean = '' as unknown as T;
  const msg = question;

  if (type === 'text') {
    const v = await clackText({
      message: msg,
      placeholder:
        typeof defaultValue === 'string' ? (defaultValue as string) : undefined,
      initialValue:
        typeof defaultValue === 'string' ? (defaultValue as string) : undefined,
      validate: validate
        ? (val: string | undefined) => {
            if (val === undefined) return 'Value is required';
            const res = validate(val);
            return res === true ? undefined : (res as string);
          }
        : undefined
    });
    if (isCancel(v)) {
      clackCancel('Operation cancelled.');
      process.exit(130);
    }
    value = v as T;
  } else if (type === 'confirm') {
    const v = await clackConfirm({
      message: msg,
      initialValue: (defaultValue as boolean | undefined) ?? false
    });
    if (isCancel(v)) {
      clackCancel('Operation cancelled.');
      process.exit(130);
    }
    value = v as boolean;
  } else if (type === 'select') {
    const options = normalizeChoices(param.choices) || [];
    const v = await clackSelect({
      message: msg,
      options,
      initialValue: (defaultValue as unknown as string) || undefined
    });
    if (isCancel(v)) {
      clackCancel('Operation cancelled.');
      process.exit(130);
    }
    value = v as T;
  } else if (type === 'multiselect') {
    const options = normalizeChoices(param.choices) || [];
    const initialValues = ((defaultValue as unknown as T[]) || []).map((v) =>
      String(v)
    );
    const v = await clackMultiselect({
      message: msg,
      options,
      initialValues
    });
    if (isCancel(v)) {
      clackCancel('Operation cancelled.');
      process.exit(130);
    }
    value = v as T[];
  } else if (type === 'multiLevelSelect') {
    const items = (param.treeItems || []) as MultiLevelSelectItem[];
    const v = await multiLevelSelect(items, msg);
    if (v === null) {
      clackCancel('Operation cancelled.');
      process.exit(130);
    }
    value = v as T;
  }

  return value;
}

export default promptParameter;
