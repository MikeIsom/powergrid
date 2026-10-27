<template>
    <g
        class="button enabled"
        data-board-control="log"
        role="button"
        aria-label="Show log"
        tabindex="0"
        @click="$emit('click')"
        @keydown.enter.prevent="$emit('click')"
        @keydown.space.prevent="$emit('click')"
    >
        <rect width="80" height="26" fill="#e9edf2" stroke="#1f2a36" rx="5" />
        <image x="30" y="3" width="20" height="20" href="../../icons/log.svg" aria-hidden="true" />
        <title>Show log</title>
    </g>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component
export default class LogButton extends Vue {
}
</script>
