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
  question: string; // 显示给用户的问题
  defaultValue?: T | T[] | boolean; // 默认值
  label?: string; // 问题的标签（可用于日志）
  type: PromptType;
  choices?: Array<PromptChoice<T>>; // 仅 select/multiselect 使用
  pageSize?: number; // 列表显示条数
  validate?: (input: string) => boolean | string; // 输入校验
  treeItems?: MultiLevelSelectItem[]; // 仅 multiLevelSelect 使用
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
