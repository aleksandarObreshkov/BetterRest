import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const codeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword,               color: '#af00db' },
  { tag: tags.typeName,              color: '#267f99' },
  { tag: tags.propertyName,         color: '#001080' },
  { tag: tags.name,                  color: '#001080' },
  { tag: tags.definition(tags.name), color: '#795e26' },
  { tag: tags.string,                color: '#a31515' },
  { tag: tags.number,                color: '#098658' },
  { tag: tags.bool,                  color: '#0000ff' },
  { tag: tags.null,                  color: '#0000ff' },
  { tag: tags.comment,               color: '#008000', fontStyle: 'italic' },
  { tag: tags.operator,              color: '#000000' },
  { tag: tags.punctuation,          color: '#000000' },
])
