#!/bin/bash

tree-sitter generate
echo "./corpus/$1.shard"
tree-sitter parse "./corpus/$1.shard"
tree-sitter highlight "./corpus/$1.shard"
