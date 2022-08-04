#!/bin/bash

mongodump --uri mongodb://127.0.0.1:27017/grazily --gzip --archive=dump_grazily__`date "+%Y-%m-%d"`.gz
