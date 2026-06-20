package com.testcaseiq.api.security;

import java.security.MessageDigest;

final class MessageDigestSupport {

    private MessageDigestSupport() {
    }

    static boolean isEqual(byte[] left, byte[] right) {
        return MessageDigest.isEqual(left, right);
    }
}
