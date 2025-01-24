#include<bits/stdc++.h>
using namespace std;
int main(){
    int n;cin>>n;
    int m;cin>>m;
    vector<vector<int>> a(n,vector<int> (m,0));
    for(auto &v:a)cin>>v[0]>>v[1];
    sort(a.begin(),a.end());
    int ans = 0;
    int curEnd = a[0][1];
    int i=1;
    while(true){
        while(i<n && a[i][0] <= curEnd){
            curEnd = min(curEnd,a[i][1]);
            i++;
        }
        ans++;
        if(i==n)break;
        curEnd = a[i][1];
    }
    cout<<ans<<endl;
}